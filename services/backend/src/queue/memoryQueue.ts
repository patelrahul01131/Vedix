import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { MemoryExtractor } from '../MemoryExtractor';
import { MemoryCritic } from '../MemoryCritic';
import { logger } from '../logger';

// ──────────────────────────────────────────────────────────────────────────────
// Redis Connection
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Singleton Redis connection — shared by Queue and Worker to minimise connections.
 *
 * Production safety:
 *  - maxRetriesPerRequest: null → required by BullMQ (never give up on blocked cmds)
 *  - enableOfflineQueue: true → queues commands while reconnecting (default)
 *  - lazyConnect: false → connect immediately so we know early if Redis is down
 *  - retryStrategy → exponential backoff capped at 30s; logs each retry attempt
 *    so ops can see the issue. Does NOT crash the process.
 */
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  retryStrategy(times: number) {
    const delay = Math.min(times * 1000, 30_000); // cap at 30 s
    logger.warn(`[Redis] Reconnect attempt #${times} — retrying in ${delay}ms`);
    return delay;
  },
});

connection.on('connect', () => {
  logger.info('[Redis] Connected successfully.');
});

connection.on('ready', () => {
  logger.info('[Redis] Ready to accept commands.');
});

connection.on('error', (err) => {
  // Log but do NOT crash — BullMQ will queue jobs in memory and retry when Redis recovers.
  logger.error(`[Redis] Connection error: ${err.message}`);
});

connection.on('close', () => {
  logger.warn('[Redis] Connection closed. Waiting for reconnect...');
});

connection.on('reconnecting', () => {
  logger.warn('[Redis] Reconnecting to Redis...');
});

// ──────────────────────────────────────────────────────────────────────────────
// Queue & Worker
// ──────────────────────────────────────────────────────────────────────────────

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
const worker = new Worker(
  'memory-evaluation',
  async (job: Job) => {
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
            backoff: { type: 'exponential', delay: 5000 },
          });
          logger.info(
            `[Queue] Enqueued critic review for ${createdIds.length} new memories from mission ${missionId}.`
          );
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
  },
  {
    connection: connection as any,
    concurrency: 1, // Serial — avoids LLM rate limit collisions
    limiter: {
      max: 5,
      duration: 60000, // Max 5 jobs per minute across all job types
    },
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Daily Decay Schedule
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Schedule daily memory decay at 02:00 every night.
 * Removes any stale repeatable job from previous deploys first
 * to avoid duplicate schedules on server restart.
 *
 * If Redis is unavailable at startup, this logs a warning but does NOT crash.
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
      backoff: { type: 'exponential', delay: 10000 },
    });
    logger.info('[Queue] Memory decay scheduled daily at 02:00 AM.');
  } catch (e) {
    // Non-fatal — if Redis is unavailable, decay will be rescheduled on next startup
    logger.error(`[Queue] Failed to schedule memory decay (Redis may be starting up): ${e}`);
  }
};

scheduleDailyDecay();

// ──────────────────────────────────────────────────────────────────────────────
// Worker Event Listeners
// ──────────────────────────────────────────────────────────────────────────────

worker.on('completed', (job) => {
  logger.info(`[Queue] Job ${job.id} (${job.name}) completed successfully.`);
});

worker.on('failed', (job, err) => {
  logger.error(`[Queue] Job ${job?.id} (${job?.name}) failed with: ${err.message}`);
});

worker.on('error', (err) => {
  // Worker-level error (e.g., Redis disconnect mid-job) — log but don't crash
  logger.error(`[Queue] Worker error: ${err.message}`);
});

logger.info('[Queue] MemoryQueue and Worker initialized and ready.');
