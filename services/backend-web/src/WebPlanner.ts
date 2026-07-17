import { WebToolRegistry, CanvaConnector } from './WebToolRegistry';
import { ModelGateway } from '@vedix/model-gateway';
import { WebSearchTool, GmailTool } from '@vedix/tool-sdk';
import { MemoryQueueService } from './memory/MemoryQueueService';
import { MemoryRetrievalService } from './memory/MemoryRetrievalService';

export class WebPlanner {
  private registry: WebToolRegistry;
  private gateway: ModelGateway;

  constructor() {
    this.registry = new WebToolRegistry();
    this.gateway = new ModelGateway('mistral-large-latest'); // Using standard model
  }

  /**
   * Executes a prompt and streams the response back via onToken callback.
   * Now implements an autonomous tool loop.
   */
  async execute(
    messages: any[], 
    onToken: (token: string) => void, 
    modelName?: string,
    enabledConnectors?: { gmail: boolean, canva: boolean },
    onActivity?: (activity: any) => void,
    userId?: string
  ): Promise<{ finalResponseText: string, generatedMessages: any[] }> {
    const systemPrompt = `You are the Vedix Web Agent. 
You are a conversational AI designed to help the user with web search, answering questions, and integrating with 3rd-party apps like Gmail and Canva.
You MUST NOT attempt to write, edit, or read files from the user's local machine or execute shell commands. 
Use your available tools (connectors) when the user asks for actions like searching the web, sending an email, or creating a design.
CRITICAL: When calling tools (like gmail_tool), you MUST provide all required parameters in the JSON payload (to, subject, body). NEVER send an empty object {}.`;

    // 1. Feature flag for new memory architecture (Activated!)
    const USE_NEW_MEMORY = true;
    const userContext = userId ? await MemoryRetrievalService.getContext(userId, undefined, USE_NEW_MEMORY) : '';
    
    const finalSystemPrompt = systemPrompt + userContext;

    // Instantiate gateway with dynamic model

    this.gateway = new ModelGateway(modelName || 'mistral-large-latest');

    // Filter tools
    const activeTools: any[] = [new WebSearchTool()];
    if (enabledConnectors?.gmail && userId) {
      activeTools.push(new GmailTool(userId));
    }
    if (enabledConnectors?.canva) {
      activeTools.push(new CanvaConnector());
    }

    let done = false;
    let loopCount = 0;
    const MAX_ITERATIONS = 8;
    
    let finalResponseText = '';
    const generatedMessages: any[] = [];
    
    // We maintain a local copy of aiMessages to append to during the loop
    const aiMessages = [...messages];

    while (!done && loopCount < MAX_ITERATIONS) {
      loopCount++;
      let hasToolCall = false;

      const responseObj = await this.gateway.generate({
        messages: aiMessages,
        systemPrompt: finalSystemPrompt,
        tools: activeTools,
        onToken: (token) => {
          onToken(token);
        },
        onToolCall: async (toolName, args) => {
          console.log(`[WebPlanner] LLM executing tool: ${toolName}`, args);
          
          if (onActivity) {
            onActivity({
              id: Date.now().toString(),
              type: 'tool',
              title: `Running ${toolName}`,
              status: 'running',
              details: JSON.stringify(args)
            });
          }
          
          const tool = activeTools.find(t => t.name === toolName);
          if (tool) {
            try {
              const result = await tool.execute(args);
              if (onActivity) {
                onActivity({
                  id: Date.now().toString(),
                  type: 'tool',
                  title: `Completed ${toolName}`,
                  status: 'done'
                });
              }
              return result;
            } catch (err: any) {
               if (onActivity) {
                onActivity({
                  id: Date.now().toString(),
                  type: 'tool',
                  title: `Failed ${toolName}`,
                  status: 'error',
                  details: err.message
                });
              }
              return { error: err.message };
            }
          }
          return { error: 'Tool not found' };
        }
      });

      const { text, messages: newMessages } = responseObj as any;

      for (const msg of newMessages) {  
        aiMessages.push(msg);
        generatedMessages.push(msg);

        if (msg.role === 'assistant' && Array.isArray(msg.content)) {
          const toolCallParts = msg.content.filter((c: any) => c.type === 'tool-call');
          if (toolCallParts.length > 0) {
            hasToolCall = true;
          }
        }
      }

      if (text && text.trim().length > 0) {
        finalResponseText += text;
      }

      if (!hasToolCall) {
        done = true;
      }
    }

    if (userId) {
      const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
      MemoryQueueService.enqueue(userId, lastUserMessage, finalResponseText, 'WEB');
    }

    return { finalResponseText, generatedMessages };
  }
}
