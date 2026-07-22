import { db } from '@vedix/database';
import { getSemanticMemoryTable } from './LanceDB';
import { ModelGateway } from '@vedix/model-gateway';
import { RedisCache } from './RedisCache';

export class MemoryRetrievalService {
  private static gateway = new ModelGateway('mistral-large-latest');

  /**
   * Retrieves context from both Postgres (Explicit) and LanceDB (Semantic).
   */
  static async getContext(userId: string, currentQuery?: string): Promise<string> {
    try {
      // 1. Check Redis Cache if we have a query
      if (currentQuery) {
        const cached = await RedisCache.getCachedMemory(userId, currentQuery);
        if (cached) return cached;
      }

      // 2. Fetch explicit preferences
      const preferences = await db.userExplicitPreference.findMany({
        where: { userId, isActive: true }
      });
      const explicitRules = preferences.map(p => `- ${p.rule} (Source: ${p.source})`).join('\n');

      // 3. Fetch semantic context from LanceDB
      let semanticContext = '';
      if (currentQuery) {
        try {
          // Check if embedding is cached
          let queryVector = await RedisCache.getCachedEmbedding(currentQuery);
          if (!queryVector) {
            const embedRes = await this.gateway.embed(currentQuery);
            queryVector = embedRes.embedding;
            await RedisCache.setCachedEmbedding(currentQuery, queryVector);
          }

          const table = await getSemanticMemoryTable();
          const results = await table.search(queryVector).where(`user_id = '${userId}'`).limit(3).execute();
          semanticContext = results.map(r => r.content).join('\n\n');
        } catch (semanticErr) {
          console.error(`[MemoryRetrievalService] Semantic search failed:`, semanticErr);
        }
      }

      // 4. Combine contexts
      let finalContext = '';
      if (explicitRules.length > 0) {
        finalContext += `\n<UserPreferences>\n${explicitRules}\n</UserPreferences>\n`;
      }
      if (semanticContext.length > 0) {
        finalContext += `\n<SemanticMemory>\n${semanticContext}\n</SemanticMemory>\n`;
      }
      
      // 5. Cache the final result if we had a query
      if (currentQuery && finalContext.length > 0) {
        await RedisCache.setCachedMemory(userId, currentQuery, finalContext);
      }
      
      return finalContext;
    } catch (err) {
      console.error(`[MemoryRetrievalService] Failed to get context:`, err);
      return '';
    }
  }
}
