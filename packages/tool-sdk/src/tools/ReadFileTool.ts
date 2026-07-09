import { Tool, ToolSchema } from '../Tool';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ReadFileTool extends Tool {
  readonly name = 'read_file';
  readonly description = 'Reads the complete contents of a file.';
  readonly requiresApproval = false; // Safe operation

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file.' }
    },
    required: ['path']
  };

  async execute(args: { path?: string, filePath?: string, file_path?: string, filename?: string }): Promise<any> {
    const p = args.path || args.filePath || args.file_path || args.filename;
    if (!p || typeof p !== 'string' || p.trim() === '') {
      return { success: false, error: 'You must provide a valid "path" argument.' };
    }

    try {
      const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), '../../');
      const resolvedPath = path.resolve(workspaceRoot, p);
      
      const content = await fs.readFile(resolvedPath, 'utf8');
      return { success: true, content, message: `Successfully read ${resolvedPath}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
