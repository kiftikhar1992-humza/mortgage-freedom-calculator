export class CacheService {
  constructor(kv) {
    this.kv = kv;
  }

  async get(key) {
    const cached = await this.kv.get(key, 'json');

    if (!cached) {
      return null;
    }

    const now = Date.now();
    const expiresAt = cached.timestamp + (cached.ttl * 1000);

    if (now > expiresAt) {
      await this.kv.delete(key);
      return null;
    }

    return cached.data;
  }

  async set(key, data, options) {
    const cached = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl,
    };

    await this.kv.put(key, JSON.stringify(cached), {
      expirationTtl: options.ttl,
    });
  }

  async delete(key) {
    await this.kv.delete(key);
  }

  async getOrFetch(key, fetcher, options) {
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }
}

export const CACHE_TTL = {
  MORTGAGE_RATES: 3600,
  AFFORDABILITY_INDEX: 86400,
  HOME_PRICE_INDEX: 86400,
};
