import { Tool, ToolSchema } from '../Tool';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SyntaxCheckerTool extends Tool {
  readonly name = 'check_syntax';
  readonly description = 'Checks a file for syntax and hoisting errors. Always run this immediately after modifying a JS or TS file to ensure you did not introduce duplicates or syntax errors. Returns success or the compiler error.';
  readonly requiresApproval = false; // Safe read-only execution

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file to check.' }
    },
    required: ['path']
  };

  async execute(args: { path: string }): Promise<any> {
    if (!args.path || typeof args.path !== 'string') {
      return { success: false, error: 'Must provide a valid path.' };
    }

    try {
      const workspaceRoot = (args as any).__workspaceRoot || process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), '../../');
      const resolvedPath = path.resolve(workspaceRoot, args.path);
      const ext = path.extname(resolvedPath).toLowerCase();

      let command = '';
      if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
        // node --check verifies JS syntax without executing the code
        command = `node --check "${resolvedPath}"`;
      } else if (ext === '.ts' || ext === '.tsx') {
        // Quick syntax check for TS (skips type checking to be fast)
        const tscPath = path.join(workspaceRoot, 'node_modules', '.bin', 'tsc');
        command = `"${tscPath}" --noEmit --allowJs "${resolvedPath}"`;
      } else if (ext === '.py') {
        command = `python -m py_compile "${resolvedPath}"`;
      } else {
        return { success: true, message: `No lightweight syntax checker configured for extension ${ext}.` };
      }

      try {
        const { stdout, stderr } = await execAsync(command);
        return { success: true, message: 'Syntax check passed! No errors found.' };
      } catch (error: any) {
        // node --check outputs to stderr on failure
        const errorMessage = error.stderr || error.stdout || error.message;
        return { 
          success: false, 
          error: `Syntax Error Found! You MUST fix this before continuing. Error details:\n${errorMessage}` 
        };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
