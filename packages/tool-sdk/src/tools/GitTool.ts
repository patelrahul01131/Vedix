import { Tool, ToolSchema } from '../Tool';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export class GitTool extends Tool {
  readonly name = 'git_action';
  readonly description = 'Perform a git operation: status, add, or commit. Provides a safe abstraction over raw terminal commands for git.';
  readonly requiresApproval = true;

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      action: { 
        type: 'string', 
        enum: ['status', 'add', 'commit'],
        description: 'The git action to perform.' 
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'For "add" action: list of files to stage. Use ["."] for all.'
      },
      message: {
        type: 'string',
        description: 'For "commit" action: the commit message.'
      }
    },
    required: ['action']
  };

  async execute(args: { action: string, files?: string[], message?: string }): Promise<any> {
    try {
      let gitArgs: string[] = [];
      
      if (args.action === 'status') {
        gitArgs = ['status', '-s'];
      } else if (args.action === 'add') {
        const filesToStage = args.files && args.files.length > 0 ? args.files : ['.'];
        gitArgs = ['add', ...filesToStage];
      } else if (args.action === 'commit') {
        if (!args.message) return { success: false, error: 'Commit message required' };
        gitArgs = ['commit', '-m', args.message];
      } else {
        return { success: false, error: 'Unsupported git action' };
      }

      const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), '../../');
      const { stdout, stderr } = await execFileAsync('git', gitArgs, { cwd: workspaceRoot });
      
      return { 
        success: true, 
        action: args.action,
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
