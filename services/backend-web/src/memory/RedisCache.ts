import Redis from 'ioredis';
import { createHash } from 'crypto';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  console.error('[RedisCache] Connection error:', err);
});

export class RedisCache {
  private static generateHash(query: string): string {
    return createHash('md5').update(query).digest('hex');
  }

  static async getCachedEmbedding(query: string): Promise<number[] | null> {
    try {
      if (redis.status !== 'ready') return null;
      const key = `cache:embedding:${this.generateHash(query)}`;
      const cached = await redis.get(key);
      if (cached) {
        console.info(`[RedisCache] HIT on embedding for query hash: ${key}`);
        return JSON.parse(cached);
      }
      console.info(`[RedisCache] MISS on embedding for query hash: ${key}`);
      return null;
    } catch (err) {
      console.error('[RedisCache] Failed to get embedding:', err);
      return null;
    }
  }

  static async setCachedEmbedding(query: string, embedding: number[]): Promise<void> {
    try {
      if (redis.status !== 'ready') return;
      const key = `cache:embedding:${this.generateHash(query)}`;
      // TTL: 24 hours
      await redis.set(key, JSON.stringify(embedding), 'EX', 24 * 60 * 60);
    } catch (err) {
      console.error('[RedisCache] Failed to set embedding:', err);
    }
  }

  static async getCachedMemory(userId: string, query: string): Promise<string | null> {
    try {
      if (redis.status !== 'ready') return null;
      const key = `cache:memory:web:${userId}:${this.generateHash(query)}`;
      const cached = await redis.get(key);
      if (cached) {
        console.info(`[RedisCache] HIT on memory for user ${userId}, query hash: ${key}`);
        return cached;
      }
      console.info(`[RedisCache] MISS on memory for user ${userId}, query hash: ${key}`);
      return null;
    } catch (err) {
      console.error('[RedisCache] Failed to get memory:', err);
      return null;
    }
  }

  static async setCachedMemory(userId: string, query: string, memory: string): Promise<void> {
    try {
      if (redis.status !== 'ready') return;
      const key = `cache:memory:web:${userId}:${this.generateHash(query)}`;
      // TTL: 1 hour
      await redis.set(key, memory, 'EX', 60 * 60);
    } catch (err) {
      console.error('[RedisCache] Failed to set memory:', err);
    }
  }

  static async invalidateUserMemory(userId: string): Promise<void> {
    try {
      if (redis.status !== 'ready') return;
      const pattern = `cache:memory:web:${userId}:*`;
      // In production, you might want to use SCAN for this, but for simplicity we use keys here.
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.info(`[RedisCache] Invalidated ${keys.length} memory keys for user ${userId}`);
      }
    } catch (err) {
      console.error(`[RedisCache] Failed to invalidate memory for user ${userId}:`, err);
    }
  }

  static async invalidateAllMemory(): Promise<void> {
    try {
      if (redis.status !== 'ready') return;
      const pattern = `cache:memory:web:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.info(`[RedisCache] Invalidated all (${keys.length}) memory keys globally`);
      }
    } catch (err) {
      console.error('[RedisCache] Failed to invalidate all memory globally:', err);
    }
  }
}
