import { Tool, ToolSchema } from '../Tool';
import * as fs from 'fs/promises';
import * as path from 'path';
import { validateWorkspacePath } from '../utils/pathSecurity';

export class DeleteFileTool extends Tool {
  readonly name = 'delete_file';
  readonly description = 'Deletes a file permanently.';
  readonly requiresApproval = true;

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file to delete.' }
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
      const { safe, resolvedPath } = validateWorkspacePath(workspaceRoot, p);
      if (!safe) {
        return { success: false, error: 'Access denied: path is outside the workspace root.' };
      }
      
      await fs.unlink(resolvedPath);
      return { success: true, message: `Successfully deleted ${resolvedPath}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
