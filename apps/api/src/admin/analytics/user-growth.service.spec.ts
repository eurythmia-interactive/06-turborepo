import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserGrowthService } from './user-growth.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

type PrismaClient = any;
type DashboardCacheService = any;

describe('UserGrowthService', () => {
  let service: UserGrowthService;
  let mockPrisma: PrismaClient;
  let mockCacheService: DashboardCacheService;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      tenant: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    service = new UserGrowthService(mockPrisma, mockCacheService);
  });

  describe('getGrowth', () => {
    it('should return cached growth data if available', async () => {
      const cachedData = {
        metric: 'users',
        period: 'day',
        data: [{ date: '2024-01-01', new: 5, cumulative: 100, growthRate: 5 }],
        summary: { total: 5, average: 5, peak: { date: '2024-01-01', value: 5 }, growth: 5 },
      };

      vi.mocked(mockCacheService.get).mockReturnValue(cachedData);

      const result = await service.getGrowth('users', 'day', 30);

      expect(result).toEqual(cachedData);
      expect(mockCacheService.get).toHaveBeenCalledWith('growth:users:day:30');
      expect(mockPrisma.user?.findMany).not.toHaveBeenCalled();
    });

    it('should fetch and cache user growth data when not cached', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const users = [
        { createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
      ];

      vi.mocked(mockPrisma.user!.findMany).mockResolvedValue(users as any);
      vi.mocked(mockPrisma.user!.count).mockResolvedValue(100);

      const result = await service.getGrowth('users', 'day', 7);

      expect(result.metric).toBe('users');
      expect(result.period).toBe('day');
      expect(result.data).toHaveLength(7);
      expect(result.summary.total).toBe(3);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should fetch tenant growth data when metric is tenants', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const tenants = [{ createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }];

      vi.mocked(mockPrisma.tenant!.findMany).mockResolvedValue(tenants as any);
      vi.mocked(mockPrisma.tenant!.count).mockResolvedValue(10);

      const result = await service.getGrowth('tenants', 'day', 7);

      expect(result.metric).toBe('tenants');
      expect(result.data).toHaveLength(7);
      expect(result.summary.total).toBe(1);
    });

    it('should fill missing dates with zero', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const users = [{ createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) }];

      vi.mocked(mockPrisma.user!.findMany).mockResolvedValue(users as any);
      vi.mocked(mockPrisma.user!.count).mockResolvedValue(0);

      const result = await service.getGrowth('users', 'day', 7);

      expect(result.data).toHaveLength(7);
      const nonZeroDays = result.data.filter((d) => d.new > 0);
      expect(nonZeroDays).toHaveLength(1);
    });

    it('should calculate cumulative totals correctly', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const users = [
        { createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
      ];

      vi.mocked(mockPrisma.user!.findMany).mockResolvedValue(users as any);
      vi.mocked(mockPrisma.user!.count).mockResolvedValue(10);

      const result = await service.getGrowth('users', 'day', 5);

      const lastDay = result.data[result.data.length - 1];
      expect(lastDay?.cumulative).toBe(14);
    });

    it('should calculate growth rates correctly', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      const now = new Date();
      const users = [
        { createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
      ];

      vi.mocked(mockPrisma.user!.findMany).mockResolvedValue(users as any);
      vi.mocked(mockPrisma.user!.count).mockResolvedValue(10);

      const result = await service.getGrowth('users', 'day', 5);

      const lastDay = result.data[result.data.length - 1];
      expect(lastDay?.growthRate).toBeDefined();
    });
  });
});
