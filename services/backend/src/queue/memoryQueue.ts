import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { MemoryExtractor } from '../MemoryExtractor';
import { logger } from '../logger';

// Create a singleton connection to avoid multiple Redis connections
const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

export const memoryQueue = new Queue('memory-evaluation', { connection: connection as any });

const extractor = new MemoryExtractor();

// The worker processes jobs in the background safely
const worker = new Worker('memory-evaluation', async (job: Job) => {
  try {
    if (job.name === 'evaluateMission') {
      const { missionId, userId } = job.data;
      logger.info(`[Queue] Processing evaluateMission for ${missionId}`);
      await extractor.evaluateMission(missionId, userId);
    } else if (job.name === 'summarizeMission') {
      const { missionId } = job.data;
      logger.info(`[Queue] Processing summarizeMission for ${missionId}`);
      await extractor.summarizeMission(missionId);
    }
  } catch (e) {
    logger.error(`[Queue] Job failed critically: ${e}`);
    throw e;
  }
}, { 
  connection: connection as any,
  concurrency: 1, // Process one at a time to strictly avoid LLM rate limits
  limiter: {
    max: 5,
    duration: 60000 // Max 5 extractions per minute to respect Mistral 429 errors
  }
});

worker.on('completed', job => {
  logger.info(`[Queue] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`[Queue] Job ${job?.id} failed with error ${err.message}`);
});

logger.info('MemoryQueue and Worker initialized and ready.');
