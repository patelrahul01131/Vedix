import { db } from '@vedix/database';

export class TokenTracker {
  static async log(modelName: string, service: string, usage: any) {
    if (!usage) return;
    try {
      await db.tokenLog.create({
        data: {
          modelName,
          service,
          promptTokens: usage.promptTokens || 0,
          completionTokens: usage.completionTokens || 0,
          totalTokens: usage.totalTokens || 0,
        }
      });
    } catch (e) {
      console.error('Failed to log tokens', e);
    }
  }
}
