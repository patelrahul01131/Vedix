import { db } from '@vedix/database';
import { getSemanticMemoryTable } from './LanceDB';
import { RedisCache } from './RedisCache';

export class UnifiedMemoryCritic {
  
  /**
   * Evaluates and prunes memories across Postgres and LanceDB.
   * This should be called via a Cron Job (e.g. nightly)
   */
  static async evaluateAndPrune() {
    console.log('[UnifiedMemoryCritic] Starting memory pruning and decay process...');
    
    try {
      // 1. Decay explicit preferences (Postgres)
      // Subtract 5 confidence from preferences not updated recently.
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const updatedPrefs = await db.userExplicitPreference.updateMany({
        where: {
          updatedAt: { lte: sevenDaysAgo }
        },
        data: {
          confidence: { decrement: 5 }
        }
      });
      console.log(`[UnifiedMemoryCritic] Decayed confidence for ${updatedPrefs.count} old preferences.`);

      // 2. Delete preferences where confidence <= 0
      const deletedPrefs = await db.userExplicitPreference.deleteMany({
        where: {
          confidence: { lte: 0 }
        }
      });
      console.log(`[UnifiedMemoryCritic] Pruned ${deletedPrefs.count} dead preferences.`);

      // 3. LanceDB Pruning (Semantic vectors)
      const table = await getSemanticMemoryTable();
      
      // In LanceDB, we can search or delete based on SQL filters if using a newer API,
      // or we can iterate. Assuming a simple delete clause if metadata supports it.
      // (Depends on exact vectordb package version, usually supports simple SQL filters)
      try {
        await table.delete("confidence <= 0");
        console.log(`[UnifiedMemoryCritic] Pruned dead semantic vectors from LanceDB.`);
      } catch (lanceErr) {
        // If the 'confidence' metadata isn't set up perfectly yet in LanceDB schema
        console.warn(`[UnifiedMemoryCritic] Could not prune LanceDB (might need confidence field initialized):`, lanceErr);
      }
      
      // 4. Invalidate global memory cache
      await RedisCache.invalidateAllMemory();

      console.log('[UnifiedMemoryCritic] Memory pruning complete.');
      return true;
    } catch (error) {
      console.error('[UnifiedMemoryCritic] Failed to prune memories:', error);
      return false;
    }
  }
}
