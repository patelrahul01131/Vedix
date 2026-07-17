import { db } from '@vedix/database';
import { getSemanticMemoryTable } from './LanceDB';
// import { embed } from '@vedix/model-gateway'; // Assuming you have an embedding function

export class MemoryRetrievalService {
  /**
   * Retrieves context from both Postgres (Explicit) and LanceDB (Semantic).
   * Feature flagged so we can toggle it easily.
   */
  static async getContext(userId: string, currentQuery?: string, useNewMemory: boolean = false): Promise<string> {
    if (!useNewMemory) {
      // Fallback to old behavior or empty
      return '';
    }

    try {
      // 1. Fetch explicit preferences
      const preferences = await db.userExplicitPreference.findMany({
        where: { userId, isActive: true }
      });
      const explicitRules = preferences.map(p => `- ${p.rule} (Source: ${p.source})`).join('\n');

      // 2. Fetch semantic context (Dummy implementation without actual embedding call)
      // let semanticContext = '';
      // if (currentQuery) {
      //   const queryVector = await embed(currentQuery);
      //   const table = await getSemanticMemoryTable();
      //   const results = await table.search(queryVector).where(`user_id = '${userId}'`).limit(3).execute();
      //   semanticContext = results.map(r => r.content).join('\n');
      // }

      let finalContext = '';
      if (explicitRules.length > 0) {
        finalContext += `\n<UserPreferences>\n${explicitRules}\n</UserPreferences>\n`;
      }
      
      return finalContext;
    } catch (err) {
      console.error(`[MemoryRetrievalService] Failed to get context:`, err);
      return '';
    }
  }
}
