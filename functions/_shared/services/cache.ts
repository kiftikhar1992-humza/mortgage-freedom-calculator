export interface CacheOptions {
  ttl: number; // Time to live in seconds
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.kv.get<CachedData<T>>(key, 'json');

    if (!cached) {
      return null;
    }

    const now = Date.now();
    const expiresAt = cached.timestamp + (cached.ttl * 1000);

    if (now > expiresAt) {
      // Cache expired, delete it
      await this.kv.delete(key);
      return null;
    }

    return cached.data;
  }

  async set<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl,
    };

    // KV expirationTtl is in seconds
    await this.kv.put(key, JSON.stringify(cached), {
      expirationTtl: options.ttl,
    });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  MORTGAGE_RATES: 3600,        // 1 hour
  AFFORDABILITY_INDEX: 86400,  // 24 hours
  HOME_PRICE_INDEX: 86400,     // 24 hours
} as const;
