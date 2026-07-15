import { Tool, ToolSchema } from '../Tool';
import * as os from 'os';

export class SystemInfoTool implements Tool {
  name = 'system_info';
  description = 'Retrieves the hardware specifications and OS details of the user\'s machine (CPU, RAM, OS version, architecture, uptime). Use this when you need to know the capabilities of the host system.';
  requiresApproval = false; // Safe read-only operation

  schema: ToolSchema = {
    type: 'object',
    properties: {
      details: {
        type: 'string',
        description: 'Optional specific detail to retrieve (e.g., "cpu", "memory", "os"). Leave empty for a full summary.',
      },
    },
    required: [],
  };

  async execute(args: Record<string, unknown>): Promise<string> {
    const detail = (args.details as string)?.toLowerCase();

    try {
      const cpuInfo = os.cpus();
      const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2) + ' GB';
      const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2) + ' GB';
      const platform = os.platform();
      const release = os.release();
      const arch = os.arch();
      const uptime = (os.uptime() / 3600).toFixed(2) + ' hours';

      // Ensure we have at least one CPU to read from
      const mainCpu = cpuInfo.length > 0 ? cpuInfo[0].model : 'Unknown CPU';
      const cpuCores = cpuInfo.length;

      if (detail === 'cpu') {
        return JSON.stringify({ model: mainCpu, cores: cpuCores, architecture: arch }, null, 2);
      } else if (detail === 'memory') {
        return JSON.stringify({ total: totalMem, free: freeMem }, null, 2);
      } else if (detail === 'os') {
        return JSON.stringify({ platform, release, architecture: arch, uptime }, null, 2);
      }

      // Default: return full summary
      return JSON.stringify({
        os: { platform, release, architecture: arch },
        cpu: { model: mainCpu, cores: cpuCores },
        memory: { total: totalMem, free: freeMem },
        uptime
      }, null, 2);
    } catch (err: any) {
      return `Failed to retrieve system specs: ${err.message}`;
    }
  }
}
