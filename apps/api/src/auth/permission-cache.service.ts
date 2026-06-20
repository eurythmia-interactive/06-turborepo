import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly ROLE_TTL = 60 * 60 * 1000;
  private readonly USER_TTL = 5 * 60 * 1000;

  getRolePermissions(roleId: string): string[] | null {
    const result = this.get<string[]>(`role:${roleId}`);
    this.logger.debug(`getRolePermissions(${roleId}): ${result ? 'HIT' : 'MISS'}`);
    return result;
  }

  setRolePermissions(roleId: string, permissions: string[]): void {
    this.set(`role:${roleId}`, permissions, this.ROLE_TTL);
    this.logger.debug(`setRolePermissions(${roleId}): cached ${permissions.length} permissions`);
  }

  getUserPermissions(userId: string): string[] | null {
    const result = this.get<string[]>(`user:${userId}`);
    this.logger.debug(`getUserPermissions(${userId}): ${result ? 'HIT' : 'MISS'}`);
    return result;
  }

  setUserPermissions(userId: string, permissions: string[]): void {
    this.set(`user:${userId}`, permissions, this.USER_TTL);
    this.logger.debug(`setUserPermissions(${userId}): cached ${permissions.length} permissions`);
  }

  invalidateRole(roleId: string): void {
    this.cache.delete(`role:${roleId}`);
    let userCacheCount = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith('user:')) {
        this.cache.delete(key);
        userCacheCount++;
      }
    }
    this.logger.debug(`invalidateRole(${roleId}): cleared role + ${userCacheCount} user caches`);
  }

  invalidateUser(userId: string): void {
    this.cache.delete(`user:${userId}`);
    this.logger.debug(`invalidateUser(${userId}): cleared`);
  }

  invalidateAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`invalidateAll(): cleared ${size} cache entries`);
  }

  private get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }
}
