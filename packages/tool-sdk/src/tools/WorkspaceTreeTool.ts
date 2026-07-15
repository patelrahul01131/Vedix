import { Tool, ToolSchema } from '../Tool';
import * as path from 'path';
import * as fs from 'fs/promises';

export class WorkspaceTreeTool implements Tool {
  name = 'workspace_tree';
  requiresApproval = false;
  description = 'Generates an ASCII tree chart of the specified directory structure, useful for understanding the project layout.';
  schema: ToolSchema = {
    type: 'object',
    properties: {
      dirPath: { 
        type: 'string', 
        description: 'The directory path to explore. Default is "." for the workspace root.' 
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum depth to traverse. Default is 2.'
      }
    },
    required: []
  };

  async execute(args: any): Promise<any> {
    try {
      const workspaceRoot = (args as any).__workspaceRoot || process.env.WORKSPACE_ROOT || process.cwd();
      const p = args.dirPath || '.';
      const targetPath = p === '.' ? workspaceRoot : path.resolve(workspaceRoot, p);
      const maxDepth = args.maxDepth || 2;

      // Ensure targetPath is within workspaceRoot to prevent directory traversal
      if (!targetPath.startsWith(workspaceRoot)) {
        return { error: 'Access denied: Path is outside the workspace root.' };
      }

      const tree = await this.generateTree(targetPath, '', 0, maxDepth);
      return { 
        success: true, 
        tree: `.\n${tree}` 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  private async generateTree(dirPath: string, prefix: string, currentDepth: number, maxDepth: number): Promise<string> {
    if (currentDepth >= maxDepth) {
      return `${prefix}└── ... (max depth reached)\n`;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      // Filter out common noisy directories
      const filtered = entries.filter(e => 
        !['node_modules', '.git', 'dist', 'build', 'out'].includes(e.name)
      );
      
      // Sort: directories first, then alphabetically
      filtered.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      let output = '';
      for (let i = 0; i < filtered.length; i++) {
        const entry = filtered[i];
        const isLast = i === filtered.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = isLast ? '    ' : '│   ';

        output += `${prefix}${connector}${entry.name}${entry.isDirectory() ? '/' : ''}\n`;

        if (entry.isDirectory()) {
          const childPath = path.join(dirPath, entry.name);
          output += await this.generateTree(childPath, prefix + childPrefix, currentDepth + 1, maxDepth);
        }
      }

      return output;
    } catch (err: any) {
      return `${prefix}└── [Error reading directory: ${err.message}]\n`;
    }
  }
}
