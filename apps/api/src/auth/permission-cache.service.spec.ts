import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PermissionCacheService } from './permission-cache.service.js';
describe('PermissionCacheService', () => {
  let service: PermissionCacheService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new PermissionCacheService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('role permissions', () => {
    it('should return null for uncached role', () => {
      expect(service.getRolePermissions('role-1')).toBeNull();
    });

    it('should cache and retrieve role permissions', () => {
      const permissions = ['user:read', 'user:write'];
      service.setRolePermissions('role-1', permissions);
      expect(service.getRolePermissions('role-1')).toEqual(permissions);
    });

    it('should invalidate role cache', () => {
      service.setRolePermissions('role-1', ['user:read']);
      service.invalidateRole('role-1');
      expect(service.getRolePermissions('role-1')).toBeNull();
    });

    it('should invalidate all user caches when role is invalidated', () => {
      service.setRolePermissions('role-1', ['user:read']);
      service.setUserPermissions('user-1', ['user:read']);
      service.setUserPermissions('user-2', ['user:read', 'user:write']);

      service.invalidateRole('role-1');

      expect(service.getUserPermissions('user-1')).toBeNull();
      expect(service.getUserPermissions('user-2')).toBeNull();
    });
  });

  describe('user permissions', () => {
    it('should return null for uncached user', () => {
      expect(service.getUserPermissions('user-1')).toBeNull();
    });

    it('should cache and retrieve user permissions', () => {
      const permissions = ['user:read', 'tenant:read'];
      service.setUserPermissions('user-1', permissions);
      expect(service.getUserPermissions('user-1')).toEqual(permissions);
    });

    it('should invalidate user cache', () => {
      service.setUserPermissions('user-1', ['user:read']);
      service.invalidateUser('user-1');
      expect(service.getUserPermissions('user-1')).toBeNull();
    });
  });

  describe('invalidateAll', () => {
    it('should clear entire cache', () => {
      service.setRolePermissions('role-1', ['user:read']);
      service.setRolePermissions('role-2', ['tenant:read']);
      service.setUserPermissions('user-1', ['user:read']);

      service.invalidateAll();

      expect(service.getRolePermissions('role-1')).toBeNull();
      expect(service.getRolePermissions('role-2')).toBeNull();
      expect(service.getUserPermissions('user-1')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should expire role cache after TTL', () => {
      service.setRolePermissions('role-1', ['user:read']);
      expect(service.getRolePermissions('role-1')).toEqual(['user:read']);

      vi.advanceTimersByTime(61 * 60 * 1000);
      expect(service.getRolePermissions('role-1')).toBeNull();
    });

    it('should expire user cache after TTL', () => {
      service.setUserPermissions('user-1', ['user:read']);
      expect(service.getUserPermissions('user-1')).toEqual(['user:read']);

      vi.advanceTimersByTime(6 * 60 * 1000);
      expect(service.getUserPermissions('user-1')).toBeNull();
    });

    it('should return data before TTL expires', () => {
      service.setRolePermissions('role-1', ['user:read']);

      vi.advanceTimersByTime(59 * 60 * 1000);
      expect(service.getRolePermissions('role-1')).toEqual(['user:read']);
    });
  });
});
