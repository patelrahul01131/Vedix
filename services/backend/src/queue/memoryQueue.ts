import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { MemoryExtractor } from '../MemoryExtractor';
import { MemoryCritic } from '../MemoryCritic';
import { logger } from '../logger';

// Singleton Redis connection — shared by Queue and Worker to minimise connections
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  logger.error(`[Redis] Connection error: ${err.message}`);
});

export const memoryQueue = new Queue('memory-evaluation', { connection: connection as any });

const extractor = new MemoryExtractor();
const critic = new MemoryCritic();

/**
 * Single BullMQ worker that handles all memory pipeline jobs.
 * concurrency: 1 ensures serial execution and respects Mistral rate limits.
 *
 * Job types:
 *   evaluateMission    — Shadow Evaluator: extracts facts from a completed mission
 *   summarizeMission   — Context Bloat: summarises old messages out of the sliding window
 *   reviewMemoryBatch  — MemoryCritic: reviews a batch of PENDING memories in 1 LLM call
 *   decayMemories      — Daily cron: decays confidence of stale memories
 */
const worker = new Worker('memory-evaluation', async (job: Job) => {
  try {
    if (job.name === 'evaluateMission') {
      const { missionId, userId } = job.data;
      logger.info(`[Queue] Processing evaluateMission for mission ${missionId}`);

      // evaluateMission now returns the list of newly created memory IDs
      const createdIds = await extractor.evaluateMission(missionId, userId);

      // Immediately enqueue critic review — event-driven, no polling needed
      if (createdIds.length > 0) {
        await memoryQueue.add('reviewMemoryBatch', { memoryIds: createdIds }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        });
        logger.info(`[Queue] Enqueued critic review for ${createdIds.length} new memories from mission ${missionId}.`);
      }

    } else if (job.name === 'summarizeMission') {
      const { missionId } = job.data;
      logger.info(`[Queue] Processing summarizeMission for ${missionId}`);
      await extractor.summarizeMission(missionId);

    } else if (job.name === 'reviewMemoryBatch') {
      const { memoryIds } = job.data as { memoryIds: string[] };
      logger.info(`[Queue] MemoryCritic reviewing batch of ${memoryIds.length} memories.`);
      await critic.reviewBatch(memoryIds);

    } else if (job.name === 'decayMemories') {
      logger.info(`[Queue] Running scheduled memory decay.`);
      await critic.decayMemories();

    } else {
      logger.warn(`[Queue] Unknown job name: ${job.name}`);
    }
  } catch (e) {
    logger.error(`[Queue] Job ${job.name} (${job.id}) failed: ${e}`);
    throw e; // Re-throw so BullMQ can retry with backoff
  }
}, {
  connection: connection as any,
  concurrency: 1, // Serial — avoids LLM rate limit collisions
  limiter: {
    max: 5,
    duration: 60000 // Max 5 jobs per minute across all job types
  }
});

/**
 * Schedule daily memory decay at 02:00 every night.
 * Removes any stale repeatable job from previous deploys first
 * to avoid duplicate schedules on server restart.
 */
const scheduleDailyDecay = async () => {
  try {
    const repeatableJobs = await memoryQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'decayMemories') {
        await memoryQueue.removeRepeatableByKey(job.key);
      }
    }
    await (memoryQueue as any).add('decayMemories', {}, {
      repeat: { pattern: '0 2 * * *' }, // 02:00 AM daily (server local time)
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 }
    });
    logger.info('[Queue] Memory decay scheduled daily at 02:00 AM.');
  } catch (e) {
    logger.error(`[Queue] Failed to schedule memory decay: ${e}`);
  }
};

scheduleDailyDecay();

worker.on('completed', job => {
  logger.info(`[Queue] Job ${job.id} (${job.name}) completed successfully.`);
});

worker.on('failed', (job, err) => {
  logger.error(`[Queue] Job ${job?.id} (${job?.name}) failed with: ${err.message}`);
});

logger.info('[Queue] MemoryQueue and Worker initialized and ready.');
