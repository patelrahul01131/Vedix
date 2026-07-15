import { Tool, ToolSchema } from '../Tool';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/** Maximum command string length in characters. */
const MAX_COMMAND_LENGTH = 2_000;

/** Maximum stdout/stderr size returned to the LLM (chars). */
const MAX_OUTPUT_CHARS = 50_000;

/**
 * Patterns that are unconditionally blocked, regardless of user approval.
 * These represent commands that are catastrophically destructive, exfiltrate data,
 * or attempt to escalate privileges in ways that cannot be safely previewed.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  // Recursive/forced deletion of root or near-root paths
  /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+(\/|~\/?\s*$|\/bin|\/etc|\/usr|\/var|\/home)/i,
  /rm\s+-rf\s+\//i,
  // Pipe-to-shell patterns (remote code execution)
  /curl\s+.*\|\s*(bash|sh|zsh|fish|ksh|csh)/i,
  /wget\s+.*\|\s*(bash|sh|zsh|fish|ksh|csh)/i,
  /fetch\s+.*\|\s*(bash|sh)/i,
  // Format / disk wipe
  /mkfs\./i,
  /dd\s+if=.*of=\s*\/dev\//i,
  /shred\s+.*\/dev\//i,
  // Fork bomb
  /:\s*\(\)\s*\{.*:\|:.*\}/,
  // Writing to raw devices
  />\s*\/dev\/(sda|sdb|sdc|hda|hdb|nvme)/i,
  // Dangerous chmod on root paths
  /chmod\s+(-R\s+)?777\s+(\/|\/etc|\/usr|\/bin)/i,
  // Reverse shell / network exfiltration
  /nc\s+(-[a-zA-Z]*e\s+|.*-e\s*)(\/bin\/|bash|sh)/i,
  /bash\s+-i\s+>&\s*\/dev\/tcp/i,
  /python[23]?\s+-c\s+['"]import\s+socket/i,
  // Cron-based persistence
  /crontab\s+-[^l]/i,
  // Package managers installing arbitrary remote scripts
  /npm\s+install\s+-g\s+http/i,
  // SSH key injection
  />>\s*~\/\.ssh\/authorized_keys/i,
  />\s*~\/\.ssh\/authorized_keys/i,
];

export class TerminalTool extends Tool {
  readonly name = 'run_command';
  readonly description =
    'Executes a terminal command (bash/powershell) in the workspace root. Use this to install dependencies, run tests, or execute scripts.';
  readonly requiresApproval = true; // All terminal commands require user permission!

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The exact command string to execute.' },
    },
    required: ['command'],
  };

  async execute(args: { command: string }): Promise<any> {
    if (!args || typeof args.command !== 'string' || args.command.trim() === '') {
      return { success: false, error: 'You must provide a valid "command" argument to execute.' };
    }

    // Guard: reject oversized commands (likely injection or prompt smuggling)
    if (args.command.length > MAX_COMMAND_LENGTH) {
      return {
        success: false,
        error: `Command exceeds maximum allowed length of ${MAX_COMMAND_LENGTH} characters. Please break it into smaller commands.`,
      };
    }

    // Guard: reject blocked patterns before any execution
    const blockedMatch = BLOCKED_PATTERNS.find(pattern => pattern.test(args.command));
    if (blockedMatch) {
      return {
        success: false,
        error: 'Command blocked by security policy. This type of command is not allowed.',
      };
    }

    try {
      const workspaceRoot =
        (args as any).__workspaceRoot ||
        process.env.WORKSPACE_ROOT ||
        path.resolve(process.cwd(), '../../');

      const { stdout, stderr } = await execAsync(args.command, {
        cwd: workspaceRoot,
        timeout: 30_000,
        killSignal: 'SIGTERM',
      });

      // Truncate large output to prevent memory exhaustion / token overruns
      const truncatedStdout =
        stdout.length > MAX_OUTPUT_CHARS
          ? stdout.substring(0, MAX_OUTPUT_CHARS) +
            `\n\n[Output truncated — ${stdout.length.toLocaleString()} chars total, showing first ${MAX_OUTPUT_CHARS.toLocaleString()}]`
          : stdout;

      const truncatedStderr =
        stderr.length > MAX_OUTPUT_CHARS
          ? stderr.substring(0, MAX_OUTPUT_CHARS) +
            `\n\n[Stderr truncated — ${stderr.length.toLocaleString()} chars total]`
          : stderr;

      return {
        success: true,
        stdout: truncatedStdout.trim(),
        stderr: truncatedStderr.trim(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout?.substring(0, MAX_OUTPUT_CHARS)?.trim(),
        stderr: error.stderr?.substring(0, MAX_OUTPUT_CHARS)?.trim(),
      };
    }
  }
}
