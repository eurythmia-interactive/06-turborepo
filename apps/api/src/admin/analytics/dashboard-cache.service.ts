import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(DashboardCacheService.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    this.logger.debug(`Cache HIT: ${key}`);
    return entry.data;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttl ?? this.DEFAULT_TTL),
    });
    this.logger.debug(`Cache SET: ${key} (TTL: ${ttl ?? this.DEFAULT_TTL}ms)`);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache INVALIDATE: ${key}`);
  }

  invalidatePattern(prefix: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.logger.debug(`Cache INVALIDATE_PATTERN: ${prefix}* (${count} entries)`);
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`Cache CLEAR: ${size} entries`);
  }

  size(): number {
    return this.cache.size;
  }
}
