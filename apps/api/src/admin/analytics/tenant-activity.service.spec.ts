import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantActivityService } from './tenant-activity.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

type PrismaClient = any;
type DashboardCacheService = any;

describe('TenantActivityService', () => {
  let service: TenantActivityService;
  let mockPrisma: PrismaClient;
  let mockCacheService: DashboardCacheService;

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        findMany: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
    };

    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    service = new TenantActivityService(mockPrisma, mockCacheService);
  });

  describe('getActivity', () => {
    it('should return cached activity data if available', async () => {
      const cachedData = {
        type: 'sessions',
        period: 'day',
        data: [{ timestamp: '2024-01-01T00:00:00.000Z', value: 5, label: '00:00' }],
        summary: {
          total: 5,
          average: 5,
          peak: { timestamp: '2024-01-01T00:00:00.000Z', value: 5 },
        },
      };

      vi.mocked(mockCacheService.get).mockReturnValue(cachedData);

      const result = await service.getActivity('sessions', 'day');

      expect(result).toEqual(cachedData);
      expect(mockCacheService.get).toHaveBeenCalledWith('activity:sessions:day:24');
      expect(mockPrisma.auditLog?.findMany).not.toHaveBeenCalled();
    });

    it('should fetch session activity from audit logs', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const logs = [
        { createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), action: 'auth.login' },
        { createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), action: 'auth.login' },
        { createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), action: 'auth.login' },
      ];

      vi.mocked(mockPrisma.auditLog!.findMany).mockResolvedValue(logs as any);

      const result = await service.getActivity('sessions', 'day');

      expect(result.type).toBe('sessions');
      expect(result.period).toBe('day');
      expect(result.summary.total).toBe(3);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should fetch user activity from user registrations', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const users = [
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
      ];

      vi.mocked(mockPrisma.user!.findMany).mockResolvedValue(users as any);

      const result = await service.getActivity('users', 'week');

      expect(result.type).toBe('users');
      expect(result.period).toBe('week');
      expect(result.summary.total).toBe(2);
    });

    it('should use default limit based on period', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);
      vi.mocked(mockPrisma.auditLog!.findMany).mockResolvedValue([]);

      await service.getActivity('sessions', 'day');
      expect(mockCacheService.get).toHaveBeenCalledWith('activity:sessions:day:24');

      vi.mocked(mockCacheService.get).mockReturnValue(null);
      await service.getActivity('sessions', 'week');
      expect(mockCacheService.get).toHaveBeenCalledWith('activity:sessions:week:7');

      vi.mocked(mockCacheService.get).mockReturnValue(null);
      await service.getActivity('sessions', 'month');
      expect(mockCacheService.get).toHaveBeenCalledWith('activity:sessions:month:30');
    });

    it('should use custom limit when provided', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);
      vi.mocked(mockPrisma.auditLog!.findMany).mockResolvedValue([]);

      await service.getActivity('sessions', 'day', 12);

      expect(mockCacheService.get).toHaveBeenCalledWith('activity:sessions:day:12');
    });

    it('should calculate peak correctly', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const logs = [
        { createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      ];

      vi.mocked(mockPrisma.auditLog!.findMany).mockResolvedValue(logs as any);

      const result = await service.getActivity('sessions', 'day');

      expect(result.summary.peak.value).toBe(3);
    });

    it('should calculate average correctly', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const logs = [
        { createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      ];

      vi.mocked(mockPrisma.auditLog!.findMany).mockResolvedValue(logs as any);

      const result = await service.getActivity('sessions', 'day');

      expect(result.summary.average).toBeGreaterThanOrEqual(0);
      expect(result.summary.total).toBe(2);
    });
  });
});
