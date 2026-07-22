import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedisCache } from '../RedisCache';
import { createHash } from 'crypto';
import Redis from 'ioredis';

// Mock ioredis
vi.mock('ioredis', () => {
  const RedisMock = vi.fn(() => ({
    status: 'ready',
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  }));
  return { default: RedisMock };
});

describe('RedisCache', () => {
  let mockRedisInstance: any;

  beforeEach(() => {
    // Get the mocked instance (it's a singleton in the implementation)
    // We can intercept the calls via vi.mocked if we exported the instance, 
    // but since it's internal, we mock the prototype or mock the module.
    // For simplicity, we can rely on Vitest's auto-mocking of the methods.
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate md5 hash for embedding keys', async () => {
    // Since we mock ioredis, we can spy on the set method of the prototype
    const setSpy = vi.spyOn(Redis.prototype, 'set').mockResolvedValue('OK');
    
    await RedisCache.setCachedEmbedding('test query', [0.1, 0.2, 0.3]);
    
    const expectedHash = createHash('md5').update('test query').digest('hex');
    expect(setSpy).toHaveBeenCalledWith(
      `cache:embedding:${expectedHash}`,
      '[0.1,0.2,0.3]',
      'EX',
      86400
    );
  });

  it('should invalidate user memory correctly', async () => {
    const keysSpy = vi.spyOn(Redis.prototype, 'keys').mockResolvedValue(['cache:memory:web:user123:hash1']);
    const delSpy = vi.spyOn(Redis.prototype, 'del').mockResolvedValue(1);

    await RedisCache.invalidateUserMemory('user123');
    
    expect(keysSpy).toHaveBeenCalledWith('cache:memory:web:user123:*');
    expect(delSpy).toHaveBeenCalledWith('cache:memory:web:user123:hash1');
  });

  it('should return null if cache misses', async () => {
    const getSpy = vi.spyOn(Redis.prototype, 'get').mockResolvedValue(null);
    const result = await RedisCache.getCachedMemory('user123', 'query');
    expect(result).toBeNull();
  });
});
