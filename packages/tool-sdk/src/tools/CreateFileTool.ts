import { Tool, ToolSchema } from '../Tool';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SyntaxCheckerTool } from './SyntaxCheckerTool';
import { validateWorkspacePath } from '../utils/pathSecurity';

export class CreateFileTool extends Tool {
  readonly name = 'write_file';
  readonly description = 'Creates a new file or completely overwrites an existing file with new content. Do NOT use this to edit small parts of an existing file.';
  readonly requiresApproval = true;

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file.' },
      content: { type: 'string', description: 'The complete content to write to the file.' }
    },
    required: ['path', 'content']
  };

  async execute(args: { path?: string, filePath?: string, file_path?: string, filename?: string, content?: string }): Promise<any> {
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
      
      if (args.content !== undefined) {
         await fs.writeFile(resolvedPath, args.content, 'utf8');

         // Automatically check syntax
         const syntaxTool = new SyntaxCheckerTool();
         const syntaxResult = await syntaxTool.execute({ path: resolvedPath });
         if (!syntaxResult.success) {
           return { success: true, message: `Successfully wrote complete content to ${resolvedPath}, BUT SYNTAX ERROR FOUND:\n${syntaxResult.error}\n\nYou must fix this syntax error immediately!` };
         }

         return { success: true, message: `Successfully wrote complete content to ${resolvedPath}. Syntax check passed.` };
      } else {
         return { success: false, error: 'Must provide content to write.' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
