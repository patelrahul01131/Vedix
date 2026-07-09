import { Tool, ToolSchema } from '../Tool';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export class TerminalTool extends Tool {
  readonly name = 'run_command';
  readonly description = 'Executes a terminal command (bash/powershell) in the workspace root. Use this to install dependencies, run tests, or execute scripts.';
  readonly requiresApproval = true; // All terminal commands require user permission!

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The exact command string to execute.' }
    },
    required: ['command']
  };

  async execute(args: { command: string }): Promise<any> {
    if (!args || typeof args.command !== 'string' || args.command.trim() === '') {
      return { success: false, error: 'You must provide a valid "command" argument to execute.' };
    }

    try {
      const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), '../../');
      const { stdout, stderr } = await execAsync(args.command, { cwd: workspaceRoot });
      return { 
        success: true, 
        stdout: stdout.trim(), 
        stderr: stderr.trim() 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message,
        stdout: error.stdout?.trim(),
        stderr: error.stderr?.trim()
      };
    }
  }
}
