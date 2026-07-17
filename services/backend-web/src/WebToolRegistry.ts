import { Tool, ToolSchema } from '@vedix/tool-sdk';

export class WebSearchConnector extends Tool {
  name = 'web_search';
  description = 'Search the web for real-time information.';
  requiresApproval = false;
  schema: ToolSchema = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' }
    },
    required: ['query']
  };

  async execute(args: { query: string }) {
    return { results: `Simulated search results for: ${args.query}` };
  }
}

export class GmailConnector extends Tool {
  name = 'gmail_send';
  description = 'Draft or send an email via Gmail.';
  requiresApproval = false;
  schema: ToolSchema = {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email address' },
      subject: { type: 'string', description: 'Email subject' },
      body: { type: 'string', description: 'Email body content' }
    },
    required: ['to', 'subject', 'body']
  };

  async execute(args: { to: string, subject: string, body: string }) {
    return { success: true, message: 'Email drafted successfully (stub)' };
  }
}

export class CanvaConnector extends Tool {
  name = 'canva_create_design';
  description = 'Create a new design template in Canva.';
  requiresApproval = false;
  schema: ToolSchema = {
    type: 'object',
    properties: {
      designType: { type: 'string', description: 'Type of design (e.g. poster, presentation)' },
      text: { type: 'string', description: 'Text to include in the design' }
    },
    required: ['designType']
  };

  async execute(args: { designType: string, text?: string }) {
    return { success: true, url: 'https://canva.com/design/stub' };
  }
}

export class WebToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  private registerBuiltInTools() {
    this.register(new WebSearchConnector());
    this.register(new GmailConnector());
    this.register(new CanvaConnector());
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}
