// @ts-nocheck
import { generateText, streamText, tool as aiTool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { mistral } from '@ai-sdk/mistral';
import { google } from '@ai-sdk/google';
import { ollama } from 'ollama-ai-provider';
import { Tool } from '@vedix/tool-sdk';
import { z } from 'zod';

function createZodSchema(schema: any) {
  if (schema.type === 'object') {
    const shape: any = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      try {
        let zType;
        if (value.type === 'string') zType = z.string().describe(value.description || '');
        else if (value.type === 'number') zType = z.number().describe(value.description || '');
        else if (value.type === 'boolean') zType = z.boolean().describe(value.description || '');
        else if (value.type === 'array') zType = z.array(z.any()).describe(value.description || '');
        else zType = z.any().describe(value.description || '');
        
        if (schema.required && !schema.required.includes(key)) {
          zType = zType.optional();
        }
        shape[key] = zType;
      } catch (err) {
        console.error(`Failed to map schema property ${key}:`, err);
        shape[key] = z.any();
      }
    }
    return z.object(shape);
  }
  return z.any();
}

export interface GenerateOptions {
  messages: any[];
  systemPrompt?: string;
  tools?: Tool[];
  onToken?: (token: string) => void;
  onToolCall?: (toolName: string, args: any) => Promise<any>;
}

export class ModelGateway {
  private lastToolResult: any = null;
  
  constructor(public modelName: string = 'gpt-4o') {}

  /**
   * Translates our Tool SDK definitions into Vercel AI SDK tool definitions.
   */
  private buildTools(tools: Tool[] | undefined, onToolCall?: (toolName: string, args: any) => Promise<any>) {
    if (!tools) return undefined;
    
    const aiTools: Record<string, any> = {};
    for (const t of tools) {
      // Vercel AI SDK tool definition
      aiTools[t.name] = aiTool({
        description: t.description,
        parameters: createZodSchema(t.schema), // Convert JSON Schema to Zod for AI SDK
        execute: (async (args: any) => {
          let res;
          if (onToolCall) {
            res = await onToolCall(t.name, args);
          } else {
            res = await t.execute(args);
          }
          this.lastToolResult = res;
          return res;
        }) as any
      });
    }
    return aiTools;
  }

  async generate(options: GenerateOptions) {
    const aiTools = this.buildTools(options.tools, options.onToolCall);
    
    // Parse prefix (e.g., 'openrouter:openai/gpt-4o')
    let providerName = 'openrouter';
    let rawModelName = this.modelName;

    if (this.modelName.includes(':')) {
      const parts = this.modelName.split(':');
      providerName = parts[0];
      rawModelName = parts.slice(1).join(':');
    } else {
      // Legacy fallback
      if (this.modelName.startsWith('mistral-')) providerName = 'mistral';
      else if (this.modelName.startsWith('gpt-')) providerName = 'openrouter';
    }

    let modelInstance;
    if (providerName === 'mistral') {
      modelInstance = mistral(rawModelName);
    } else if (providerName === 'google' || providerName === 'gemini') {
      modelInstance = google(rawModelName);
    } else if (providerName === 'ollama') {
      modelInstance = ollama(rawModelName);
    } else if (providerName === 'deepseek') {
      const deepseekProvider = createOpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY,
        compatibility: 'compatible'
      });
      modelInstance = deepseekProvider(rawModelName);
    } else if (providerName === 'groq') {
      const groqProvider = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROK_API_KEY,
        compatibility: 'compatible'
      });
      modelInstance = groqProvider(rawModelName);
    } else if (providerName === 'github') {
      const githubProvider = createOpenAI({
        baseURL: 'https://models.inference.ai.azure.com',
        apiKey: process.env.GITHUB_API_KEY,
        compatibility: 'compatible'
      });
      modelInstance = githubProvider(rawModelName);
    } else {
      // Default to OpenRouter
      const openRouterProvider = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPEN_ROUTER_API_KEY,
        compatibility: 'compatible'
      });
      modelInstance = openRouterProvider(rawModelName);
    }

    try {
      let sdkError: any = null;

      const result = await streamText({
        model: modelInstance as any,
        messages: options.messages as any,
        system: options.systemPrompt,
        tools: aiTools as any,
        onError: ({ error }) => {
          sdkError = error;
        }
      });

      let fullText = '';
      for await (const textPart of result.textStream) {
        fullText += textPart;
        if (options.onToken) {
          options.onToken(textPart);
        }
      }

      // Explicitly await the final text to catch any API errors that occurred asynchronously
      // and didn't propagate through the textStream iterator.
      try {
        await result.text;
      } catch (e) {
        if (sdkError) throw sdkError;
        throw e;
      }

      // Get the full messages generated in this step (including tool calls and results)
      const finalResponse = await result.response;

      return {
        text: fullText,
        messages: finalResponse.messages,
        usage: await result.usage
      };
    } catch (err: any) {
      console.error('generateText Error:', err);
      let errorMessage = err.message || 'Unknown error';

      // Attempt to extract deeper error messages from Vercel AI SDK
      if (err.lastError) {
        errorMessage = err.lastError.message || errorMessage;
        if (err.lastError.responseBody) {
          try {
            const body = JSON.parse(err.lastError.responseBody);
            if (body.error && body.error.message) {
              errorMessage = body.error.message;
              if (body.error.metadata && body.error.metadata.raw) {
                errorMessage = body.error.metadata.raw;
              }
            }
          } catch(e) {}
        }
      } else if (err.responseBody) {
        try {
          const body = JSON.parse(err.responseBody);
          if (body.error && body.error.message) {
            errorMessage = body.error.message;
          }
        } catch(e) {}
      }

      throw new Error(`LLM Generation Failed: ${errorMessage}`);
    }
  }

  async embed(text: string) {
    const { getEmbedding } = await import('@vedix/tool-sdk');
    const res = await getEmbedding(text);
    if (!res.success) {
      throw new Error(res.error || 'Failed to generate embedding');
    }
    return { embedding: res.vector };
  }
}
