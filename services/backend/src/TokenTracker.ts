import { db } from '@vedix/database';

export class TokenTracker {
  static async log(modelName: string, service: string, usage: any, messageId?: string, missionId?: string) {
    if (!usage) return;
    try {
      await db.tokenLog.create({
        data: {
          modelName,
          service,
          promptTokens: usage.promptTokens || 0,
          completionTokens: usage.completionTokens || 0,
          totalTokens: usage.totalTokens || 0,
          messageId,
          missionId,
        }
      });
    } catch (e) {
      console.error('Failed to log tokens', e);
    }
  }
}
