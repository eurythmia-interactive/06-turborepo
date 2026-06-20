import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DashboardCacheService } from './dashboard-cache.service.js';

describe('DashboardCacheService', () => {
  let service: DashboardCacheService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new DashboardCacheService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get/set', () => {
    it('should return null for uncached key', () => {
      expect(service.get('unknown-key')).toBeNull();
    });

    it('should cache and retrieve a value', () => {
      service.set('test-key', { foo: 'bar' });
      expect(service.get('test-key')).toEqual({ foo: 'bar' });
    });

    it('should cache primitive values', () => {
      service.set('string-key', 'hello');
      service.set('number-key', 42);
      service.set('bool-key', true);

      expect(service.get('string-key')).toBe('hello');
      expect(service.get('number-key')).toBe(42);
      expect(service.get('bool-key')).toBe(true);
    });

    it('should cache arrays', () => {
      service.set('array-key', [1, 2, 3]);
      expect(service.get('array-key')).toEqual([1, 2, 3]);
    });

    it('should overwrite existing values', () => {
      service.set('key', 'first');
      expect(service.get('key')).toBe('first');

      service.set('key', 'second');
      expect(service.get('key')).toBe('second');
    });
  });

  describe('TTL expiration', () => {
    it('should expire after default TTL (5 minutes)', () => {
      service.set('key', 'value');
      expect(service.get('key')).toBe('value');

      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(service.get('key')).toBeNull();
    });

    it('should respect custom TTL', () => {
      service.set('key', 'value', 1000);
      expect(service.get('key')).toBe('value');

      vi.advanceTimersByTime(999);
      expect(service.get('key')).toBe('value');

      vi.advanceTimersByTime(2);
      expect(service.get('key')).toBeNull();
    });

    it('should return data before TTL expires', () => {
      service.set('key', 'value');

      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(service.get('key')).toBe('value');
    });
  });

  describe('invalidate', () => {
    it('should invalidate a specific key', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      service.invalidate('key1');

      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBe('value2');
    });

    it('should not throw when invalidating non-existent key', () => {
      expect(() => service.invalidate('non-existent')).not.toThrow();
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate all keys matching prefix', () => {
      service.set('metrics:today', { a: 1 });
      service.set('metrics:week', { b: 2 });
      service.set('growth:users', { c: 3 });

      service.invalidatePattern('metrics:');

      expect(service.get('metrics:today')).toBeNull();
      expect(service.get('metrics:week')).toBeNull();
      expect(service.get('growth:users')).toEqual({ c: 3 });
    });

    it('should handle no matching keys', () => {
      service.set('other:key', 'value');

      expect(() => service.invalidatePattern('metrics:')).not.toThrow();
      expect(service.get('other:key')).toBe('value');
    });
  });

  describe('clear', () => {
    it('should clear entire cache', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      service.clear();

      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
      expect(service.get('key3')).toBeNull();
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(service.size()).toBe(0);
    });

    it('should return correct count after setting values', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      expect(service.size()).toBe(2);
    });

    it('should return correct count after invalidation', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      service.invalidate('key2');
      expect(service.size()).toBe(2);
    });

    it('should not count expired entries', () => {
      service.set('key1', 'value1', 1000);
      service.set('key2', 'value2');

      vi.advanceTimersByTime(1001);

      expect(service.size()).toBe(2);
    });
  });
});
