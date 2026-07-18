import { Tool, ToolSchema } from '../Tool';
import { execSync } from 'child_process';

export class NpmPackageManagerTool implements Tool {
  name = 'npm_package_manager';
  description = 'Fetch the latest version and details for an NPM package to ensure you are using up-to-date dependencies and not hallucinating versions.';
  requiresApproval = false;

  schema: ToolSchema = {
    type: 'object',
    properties: {
      packageName: {
        type: 'string',
        description: 'The name of the NPM package to lookup (e.g. "prisma", "next").',
      },
    },
    required: ['packageName'],
  };

  async execute(args: Record<string, unknown>): Promise<string> {
    const packageName = args.packageName as string;
    if (!packageName) {
      return 'Error: packageName is required.';
    }

    try {
      const version = execSync(`npm view ${packageName} version`, { encoding: 'utf8' }).trim();
      return JSON.stringify({ packageName, latestVersion: version }, null, 2);
    } catch (err: any) {
      return `Failed to fetch package info for ${packageName}: ${err.message}`;
    }
  }
}
