import { db } from '@vedix/database';

export class MemoryQueueService {
  /**
   * Enqueues an interaction into the memory pipeline for async processing.
   * This operates in a fire-and-forget manner to prevent blocking.
   */
  static enqueue(userId: string, userMessage: string, agentResponse: string, source: string = 'WEB') {
    // We purposefully do not await this, and catch errors silently
    // to ensure this never breaks the main execution flow.
    db.memoryExtractionQueue.create({
      data: {
        userId,
        userMessage,
        agentResponse,
        source
      }
    }).then(() => {
      console.log(`[MemoryQueueService] Queued interaction for user ${userId} from ${source}`);
    }).catch(err => {
      console.error(`[MemoryQueueService] Failed to queue interaction:`, err);
    });
  }
}
