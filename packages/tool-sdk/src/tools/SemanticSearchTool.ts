import { Tool, ToolSchema } from '../Tool';
import { getCodeSnippetsTable } from '@vedix/database';
import { getEmbedding } from '../utils/embedding';

export class SemanticSearchTool extends Tool {
  readonly name = 'semantic_search';
  readonly description = 'Searches the codebase vector database for code snippets matching a semantic query. Use this to find functions, classes, or files when you do not know the exact file path.';
  readonly requiresApproval = false; // Safe read-only action

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The semantic search query.' },
      limit: { type: 'number', description: 'Max number of results to return (default 5).' }
    },
    required: ['query']
  };

  async execute(args: { query: string; limit?: number }): Promise<any> {
    if (!args || typeof args.query !== 'string' || args.query.trim() === '') {
      return { success: false, error: 'You must provide a valid "query" argument to search.' };
    }

    try {
      const table = await getCodeSnippetsTable();
      
      const embedRes = await getEmbedding(args.query);
      if (!embedRes.success || !embedRes.vector) {
        return { success: false, error: embedRes.error || 'Failed to retrieve embedding vector.' };
      }

      const queryVector = embedRes.vector;
      
      const results = await table.search(queryVector).limit(args.limit || 5).execute();
      
      return { 
        success: true, 
        results: results.map(r => ({ path: r.path, text: r.text, distance: r._distance }))
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
