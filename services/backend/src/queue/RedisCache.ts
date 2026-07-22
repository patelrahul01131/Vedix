import Redis from 'ioredis';
import { createHash } from 'crypto';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  console.error('[RedisCache Ext] Connection error:', err);
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
        console.info(`[RedisCache Ext] HIT on embedding for query hash: ${key}`);
        return JSON.parse(cached);
      }
      console.info(`[RedisCache Ext] MISS on embedding for query hash: ${key}`);
      return null;
    } catch (err) {
      console.error('[RedisCache Ext] Failed to get embedding:', err);
      return null;
    }
  }

  static async setCachedEmbedding(query: string, embedding: number[]): Promise<void> {
    try {
      if (redis.status !== 'ready') return;
      const key = `cache:embedding:${this.generateHash(query)}`;
      await redis.set(key, JSON.stringify(embedding), 'EX', 24 * 60 * 60);
    } catch (err) {
      console.error('[RedisCache Ext] Failed to set embedding:', err);
    }
  }

  static async getCachedMemory(userId: string, query: string, type: 'snippets' | 'agent' = 'agent'): Promise<string | null> {
    try {
      if (redis.status !== 'ready') return null;
      const key = `cache:memory:ext:${type}:${userId}:${this.generateHash(query)}`;
      const cached = await redis.get(key);
      if (cached) {
        console.info(`[RedisCache Ext] HIT on memory for user ${userId}, type: ${type}`);
        return cached;
      }
      console.info(`[RedisCache Ext] MISS on memory for user ${userId}, type: ${type}`);
      return null;
    } catch (err) {
      console.error('[RedisCache Ext] Failed to get memory:', err);
      return null;
    }
  }

  static async setCachedMemory(userId: string, query: string, memory: string, type: 'snippets' | 'agent' = 'agent'): Promise<void> {
    try {
      if (redis.status !== 'ready') return;
      const key = `cache:memory:ext:${type}:${userId}:${this.generateHash(query)}`;
      await redis.set(key, memory, 'EX', 60 * 60);
    } catch (err) {
      console.error('[RedisCache Ext] Failed to set memory:', err);
    }
  }

  static async invalidateUserMemory(userId: string): Promise<void> {
    try {
      if (redis.status !== 'ready') return;
      // Invalidate both snippets and agent memory for simplicity on writes
      const pattern = `cache:memory:ext:*:${userId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.info(`[RedisCache Ext] Invalidated ${keys.length} memory keys for user ${userId}`);
      }
    } catch (err) {
      console.error(`[RedisCache Ext] Failed to invalidate memory for user ${userId}:`, err);
    }
  }
}
