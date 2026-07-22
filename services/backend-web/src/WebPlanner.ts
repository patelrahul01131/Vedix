import { WebToolRegistry, CanvaConnector } from './WebToolRegistry';
import { ModelGateway } from '@vedix/model-gateway';
import { WebSearchTool, GmailTool, GenerateMediaTool, AnalyzeImageTool } from '@vedix/tool-sdk';
import { MemoryQueueService } from './memory/MemoryQueueService';
import { MemoryRetrievalService } from './memory/MemoryRetrievalService';
import { generatePlan, buildPlanContext } from './PlannerCore';

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
CRITICAL: When calling tools, you MUST provide all required parameters in the JSON payload. NEVER send an empty object {}.
IMAGE GENERATION: When using the generate_media tool, you act as an expert Prompt Engineer. You must translate the user's request into a highly detailed, descriptive, and precise visual prompt.
CRITICAL POP-CULTURE KNOWLEDGE: If the user asks for "donkey on a horse" (or misspellings like "dockey") from the movie "Welcome", they mean Majnu Bhai's famous comedic painting. The prompt MUST describe a funny, cartoonish drawing/painting of a donkey physically standing on the back of a horse. DO NOT generate an actor like Anil Kapoor riding a horse.
For any pop-culture reference, describe the actual *visual contents* of the scene, not the actor names. Make your prompt highly specific regarding style, composition, and subjects.

IMAGE ROUTING INTELLIGENCE: When a user uploads a reference image, it appears as a markdown link like \`[Reference Image](http...)\`. You MUST apply the following logic:
1. ANALYSIS: If the user asks a question *about* the image (e.g., "What is this?", "Read the text", "Describe this"), you MUST use the \`analyze_image\` tool to look at it and provide a text response. DO NOT GUESS based on the URL text.
2. GENERATION/REFERENCE: If the user asks to generate, recreate, or modify an image based on the upload (e.g., "Make this realistic", "Create an image like this"), DO NOT analyze it. Instead, extract the URL and pass it directly to the \`generate_media\` tool as the \`reference_image_url\`.
3. THIRD-PARTY ACTIONS: If the user asks to email or post the image, pass the URL to the relevant connector tools.
4. OBJECT IDENTIFICATION: To identify ANY specific object or vehicle from an image, first use \`analyze_image\`. The vision tool will provide a Primary Identification, Confidence Score, and Alternative Candidates.
- If Confidence is >90%, answer the user directly.
- If Confidence is 60%-90%, use \`web_search\` to VERIFY the specific candidates (e.g., search "Honda CB300R vs Yamaha MT15 visual differences"). NEVER search using generic visual keywords (e.g. "black motorcycle yellow rims").
- If Confidence is <60%, ask the user for a clearer image.

ERROR HANDLING: If any tool returns a \`success: false\` with an \`error\` message (e.g. Insufficient credits, API key missing), you MUST report the EXACT error message to the user so they can understand and fix the underlying problem. Do not paraphrase it as a generic "technical issue".

CRITICAL DATA ACCURACY: When asked for live data like stock prices, gold prices, or exchange rates, you MUST ONLY use the exact numbers provided in the web_search snippets. If the search snippets only contain links or descriptions but NOT the actual numeric price, you MUST NOT guess, calculate, or hallucinate a number. You must explicitly tell the user: "The live price isn't visible in the search summary, but you can find it here:" and provide the links.`;

    // 1. Fetch dynamic memory context based on the current user intent (Progressive Loading)
    let currentQuery = '';
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    if (lastUserMessage) {
      currentQuery = typeof lastUserMessage.content === 'string' 
        ? lastUserMessage.content 
        : JSON.stringify(lastUserMessage.content);
    }
    const userContext = userId ? await MemoryRetrievalService.getContext(userId, currentQuery) : '';
    
    const finalSystemPrompt = systemPrompt + userContext;

    // Instantiate gateway with dynamic model

    this.gateway = new ModelGateway(modelName || 'mistral-large-latest');

    // Filter tools
    const activeTools: any[] = [new WebSearchTool(), new GenerateMediaTool(), new AnalyzeImageTool()];
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

    // ─── Lightweight web planning phase ───────────────────────────────
    // Only plan when multiple tools are active (web tasks that chain tools,
    // e.g. "search X and email me the results"). Single-tool tasks skip this.
    // Uses same LLM-based classifier from PlannerCore (no keyword lists).
    let webPlanContext = '';
    if (activeTools.length >= 2) {
      try {
        const webPlan = await generatePlan(this.gateway, currentQuery, '');
        if (webPlan && webPlan.steps.length >= 2) {
          webPlanContext = '\n\n' + buildPlanContext(webPlan, 0);
        }
      } catch (_e) {
        // Non-blocking — fall through to tool loop without plan
      }
    }
    const webSystemPrompt = finalSystemPrompt + webPlanContext;
    // ────────────────────────────────────────────────────────────────

    while (!done && loopCount < MAX_ITERATIONS) {
      loopCount++;
      let hasToolCall = false;

      const responseObj = await this.gateway.generate({
        messages: aiMessages,
        systemPrompt: webSystemPrompt,
        tools: activeTools,
        onToken: (token) => {
          onToken(token);
        },
        onToolCall: async (toolName, args) => {
          console.log(`[WebPlanner] LLM executing tool: ${toolName}`, args);
          
          // Mistral sometimes makes parallel empty tool calls {}. We suppress these from the UI and execution.
          const isBrokenCall = !args || Object.keys(args).length === 0 || (toolName === 'web_search' && (!args.query || (typeof args.query === 'string' && args.query.trim() === '')));

          if (isBrokenCall) {
            return { success: false, error: 'Empty or invalid parameters. Please provide the required arguments.' };
          }

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
              if (result && result.success === false) {
                if (onActivity && !isBrokenCall) {
                  onActivity({
                    id: Date.now().toString(),
                    type: 'tool',
                    title: `Failed ${toolName}`,
                    status: 'error',
                    details: result.error || 'Execution failed'
                  });
                }
              } else {
                if (onActivity && !isBrokenCall) {
                  let detailsStr = undefined;
                  if (toolName === 'web_search' && result.sources && Array.isArray(result.sources)) {
                    detailsStr = JSON.stringify({ sources: result.sources });
                  }

                  onActivity({
                    id: Date.now().toString(),
                    type: 'tool',
                    title: `Completed ${toolName}`,
                    status: 'done',
                    details: detailsStr
                  });
                }
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
