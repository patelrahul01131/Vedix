import { Tool, ToolSchema } from '../Tool';
import { db } from '@vedix/database';

export class UpdateWorkingMemoryTool extends Tool {
  readonly name = 'update_working_memory';
  readonly description = 'Updates the persistent working memory (task state, to-dos, step tracking) for the current mission. Use this to keep track of your plan across multiple turns so you do not forget your progress.';
  readonly requiresApproval = false; // Safe action

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      workingMemory: { type: 'string', description: 'The new full working memory text (usually a markdown checklist or state description). Overwrites previous state.' }
    },
    required: ['workingMemory']
  };

  async execute(args: { missionId?: string; workingMemory: string }): Promise<any> {
    try {
      if (!args.missionId) return { success: false, error: 'missionId not provided by the planner' };
      await (db as any).mission.update({
        where: { id: args.missionId },
        data: { workingMemory: args.workingMemory }
      });
      return { success: true, message: 'Working memory updated successfully.' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
