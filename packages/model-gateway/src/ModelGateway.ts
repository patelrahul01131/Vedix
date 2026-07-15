// Minimal Node.js process shim — avoids requiring @types/node as a dependency
// while still getting type safety for process.env access.
declare const process: { env: Record<string, string | undefined> };

import { streamText, tool as aiTool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { mistral } from '@ai-sdk/mistral';
import { google } from '@ai-sdk/google';
import { ollama } from 'ollama-ai-provider';
import { Tool } from '@vedix/tool-sdk';
import { z, ZodTypeAny } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// Internal schema types
// ────────────────────────────────────────────────────────────────────────────

interface JsonSchemaProperty {
  type: string;
  description?: string;
}

interface JsonSchema {
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

type ZodShape = Record<string, ZodTypeAny>;

function createZodSchema(schema: JsonSchema): ZodTypeAny {
  if (schema.type === 'object') {
    const shape: ZodShape = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      try {
        const desc = value.description || '';
        let zType: ZodTypeAny;
        if (value.type === 'string') zType = z.string().describe(desc);
        else if (value.type === 'number') zType = z.number().describe(desc);
        else if (value.type === 'boolean') zType = z.boolean().describe(desc);
        else if (value.type === 'array') zType = z.array(z.any()).describe(desc);
        else zType = z.any().describe(desc);

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

// ────────────────────────────────────────────────────────────────────────────
// Public interfaces
// ────────────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  messages: Record<string, unknown>[];
  systemPrompt?: string;
  tools?: Tool[];
  onToken?: (token: string) => void;
  onToolCall?: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
}

export interface GenerateResult {
  text: string;
  messages: unknown[];
  usage: unknown;
}

export interface EmbedResult {
  embedding: number[];
}

// ────────────────────────────────────────────────────────────────────────────
// ModelGateway
// ────────────────────────────────────────────────────────────────────────────

export class ModelGateway {
  constructor(public modelName: string = 'gpt-4o') {}

  /**
   * Translates our Tool SDK definitions into Vercel AI SDK tool definitions.
   *
   * The Vercel AI SDK uses complex generic types for tools that cannot be
   * satisfied without `as any` casts at the integration boundary — this is
   * the correct approach when wrapping a third-party SDK with its own generics.
   * The surrounding Planner code is fully typed; only the SDK boundary is cast.
   */
  private buildTools(
    tools: Tool[] | undefined,
    onToolCall?: (toolName: string, args: Record<string, unknown>) => Promise<unknown>
  ): Record<string, unknown> | undefined {
    if (!tools || tools.length === 0) return undefined;

    const aiTools: Record<string, unknown> = {};
    for (const t of tools) {
      const typedSchema = t.schema as unknown as JsonSchema;
      // The Vercel AI SDK aiTool() signature uses complex generic overloads
      // based on the inferred Zod schema type. Since our schema is built
      // dynamically at runtime from JSON Schema, we must cast at the boundary.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aiTools[t.name] = (aiTool as any)({
        description: t.description,
        parameters: createZodSchema(typedSchema),
        execute: async (args: Record<string, unknown>) => {
          if (onToolCall) {
            return await onToolCall(t.name, args);
          }
          return await t.execute(args);
        },
      });
    }
    return aiTools;
  }

  /**
   * Creates an OpenAI-compatible provider with the given base URL and API key.
   * The `compatibility: 'compatible'` option is required for non-OpenAI providers
   * but may not be in all versions of the type definition, hence the cast.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private makeOpenAICompatProvider(baseURL: string, apiKey: string | undefined): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createOpenAI({ baseURL, apiKey, compatibility: 'compatible' } as any);
  }

  /**
   * Resolves the LLM provider model instance based on the modelName prefix.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveModel(): any {
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

    if (providerName === 'mistral') {
      return mistral(rawModelName);
    } else if (providerName === 'google' || providerName === 'gemini') {
      return google(rawModelName);
    } else if (providerName === 'ollama') {
      return ollama(rawModelName);
    } else if (providerName === 'deepseek') {
      return this.makeOpenAICompatProvider('https://api.deepseek.com', process.env.DEEPSEEK_API_KEY)(rawModelName);
    } else if (providerName === 'groq') {
      return this.makeOpenAICompatProvider('https://api.groq.com/openai/v1', process.env.GROK_API_KEY)(rawModelName);
    } else if (providerName === 'github') {
      return this.makeOpenAICompatProvider('https://models.inference.ai.azure.com', process.env.GITHUB_API_KEY)(rawModelName);
    } else {
      // Default to OpenRouter
      return this.makeOpenAICompatProvider('https://openrouter.ai/api/v1', process.env.OPEN_ROUTER_API_KEY)(rawModelName);
    }
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const aiTools = this.buildTools(options.tools, options.onToolCall);
    const modelInstance = this.resolveModel();

    try {
      let sdkError: Error | null = null;

      // The Vercel AI SDK streamText has complex generic overloads.
      // We cast at the SDK boundary; everything the Planner passes in is typed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (streamText as any)({
        model: modelInstance,
        messages: options.messages,
        system: options.systemPrompt,
        tools: aiTools,
        onError: ({ error }: { error: unknown }) => {
          sdkError = error as Error;
        },
      });

      let fullText = '';
      for await (const textPart of result.textStream) {
        fullText += textPart;
        if (options.onToken) {
          options.onToken(textPart as string);
        }
      }

      // Explicitly await the final text to surface async API errors
      try {
        await result.text;
      } catch (e) {
        if (sdkError) throw sdkError;
        throw e;
      }

      const finalResponse = await result.response;

      return {
        text: fullText,
        messages: finalResponse.messages,
        usage: await result.usage,
      };
    } catch (err: unknown) {
      console.error('generateText Error:', err);
      const error = err as Record<string, unknown>;
      let errorMessage = (error['message'] as string) || 'Unknown error';

      // Attempt to extract deeper error messages from Vercel AI SDK error shapes
      if (error['lastError']) {
        const lastErr = error['lastError'] as Record<string, unknown>;
        errorMessage = (lastErr['message'] as string) || errorMessage;
        if (lastErr['responseBody']) {
          try {
            const body = JSON.parse(lastErr['responseBody'] as string) as {
              error?: { message?: string; metadata?: { raw?: string } };
            };
            if (body.error?.message) {
              errorMessage = body.error.message;
              if (body.error.metadata?.raw) errorMessage = body.error.metadata.raw;
            }
          } catch (_e) {
            // ignore JSON parse failure
          }
        }
      } else if (error['responseBody']) {
        try {
          const body = JSON.parse(error['responseBody'] as string) as {
            error?: { message?: string };
          };
          if (body.error?.message) errorMessage = body.error.message;
        } catch (_e) {
          // ignore JSON parse failure
        }
      }

      throw new Error(`LLM Generation Failed: ${errorMessage}`);
    }
  }

  async embed(text: string): Promise<EmbedResult> {
    const { getEmbedding } = await import('@vedix/tool-sdk');
    const res = await getEmbedding(text);
    if (!res.success) {
      throw new Error(res.error || 'Failed to generate embedding');
    }
    return { embedding: res.vector! };
  }
}
