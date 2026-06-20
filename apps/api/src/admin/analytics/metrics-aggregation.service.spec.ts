import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsAggregationService } from './metrics-aggregation.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

type PrismaClient = any;
type AuditService = any;
type DashboardCacheService = any;

describe('MetricsAggregationService', () => {
  let service: MetricsAggregationService;
  let mockPrisma: PrismaClient;
  let mockAuditService: AuditService;
  let mockCacheService: DashboardCacheService;

  beforeEach(() => {
    mockPrisma = {
      user: {
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      tenant: {
        count: vi.fn(),
      },
      userTenant: {
        count: vi.fn(),
      },
      auditLog: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockAuditService = {
      log: vi.fn(),
    };

    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    service = new MetricsAggregationService(mockPrisma, mockAuditService, mockCacheService);
  });

  describe('calculateGrowthRate', () => {
    it('should return 0 when both values are 0', () => {
      expect(service.calculateGrowthRate(0, 0)).toBe(0);
    });

    it('should return 100 when previous is 0 and current is positive', () => {
      expect(service.calculateGrowthRate(5, 0)).toBe(100);
    });

    it('should calculate positive growth correctly', () => {
      expect(service.calculateGrowthRate(150, 100)).toBe(50);
    });

    it('should calculate negative growth correctly', () => {
      expect(service.calculateGrowthRate(50, 100)).toBe(-50);
    });

    it('should round to 1 decimal place', () => {
      expect(service.calculateGrowthRate(101, 100)).toBe(1);
      expect(service.calculateGrowthRate(155, 100)).toBe(55);
    });
  });

  describe('getMetrics', () => {
    it('should return cached metrics if available', async () => {
      const cachedMetrics = {
        users: {
          total: 100,
          active: 50,
          newToday: 5,
          newThisWeek: 20,
          growth: 10,
          byStatus: { ACTIVE: 80, SUSPENDED: 10, PENDING: 10 },
          byRole: { SUPER_ADMIN: 1, ADMIN: 5, MEMBER: 80, GUEST: 14 },
        },
        tenants: {
          total: 10,
          active: 8,
          newToday: 1,
          newThisWeek: 3,
          suspended: 2,
          avgUsersPerTenant: 10,
        },
        activity: { totalSessionsToday: 50, activeTenantsToday: 5, peakHour: 14, trend: 5 },
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z',
          label: 'Last 30 days',
        },
      };

      vi.mocked(mockCacheService.get).mockReturnValue(cachedMetrics);

      const result = await service.getMetrics('month');

      expect(result).toEqual(cachedMetrics);
      expect(mockCacheService.get).toHaveBeenCalledWith('metrics:month');
      expect(mockPrisma.user?.count).not.toHaveBeenCalled();
    });

    it('should fetch and cache metrics when not cached', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(null);

      vi.mocked(mockPrisma.user!.count)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(50) // activeUsers
        .mockResolvedValueOnce(5) // newUsersInRange
        .mockResolvedValueOnce(3) // newUsersPrevRange
        .mockResolvedValueOnce(2) // newUsersToday
        .mockResolvedValueOnce(10); // newUsersThisWeek

      vi.mocked(mockPrisma.user!.groupBy)
        .mockResolvedValueOnce([
          { status: 'ACTIVE', _count: { id: 80 } },
          { status: 'SUSPENDED', _count: { id: 10 } },
          { status: 'PENDING', _count: { id: 10 } },
        ] as any)
        .mockResolvedValueOnce([
          { role: 'SUPER_ADMIN', _count: { id: 1 } },
          { role: 'ADMIN', _count: { id: 5 } },
          { role: 'MEMBER', _count: { id: 80 } },
          { role: 'GUEST', _count: { id: 14 } },
        ] as any);

      vi.mocked(mockPrisma.tenant!.count)
        .mockResolvedValueOnce(10) // totalTenants
        .mockResolvedValueOnce(8) // activeTenants
        .mockResolvedValueOnce(1) // newTenantsToday
        .mockResolvedValueOnce(3) // newTenantsThisWeek
        .mockResolvedValueOnce(2); // suspendedTenants

      vi.mocked(mockPrisma.userTenant!.count).mockResolvedValue(100);

      vi.mocked(mockPrisma.auditLog!.count)
        .mockResolvedValueOnce(50) // sessionsToday
        .mockResolvedValueOnce(40); // prevSessions

      vi.mocked(mockPrisma.auditLog!.findMany)
        .mockResolvedValueOnce([{ tenantId: 't1' }, { tenantId: 't2' }, { tenantId: null }] as any)
        .mockResolvedValueOnce([
          { createdAt: new Date('2024-01-15T10:30:00Z') },
          { createdAt: new Date('2024-01-15T10:45:00Z') },
          { createdAt: new Date('2024-01-15T08:00:00Z') },
        ] as any);

      const result = await service.getMetrics('month');

      expect(result.users.total).toBe(100);
      expect(result.users.active).toBe(50);
      expect(result.users.byStatus.ACTIVE).toBe(80);
      expect(result.tenants.total).toBe(10);
      expect(result.tenants.avgUsersPerTenant).toBe(10);
      expect(result.activity.totalSessionsToday).toBe(50);
      expect(result.activity.peakHour).toBeGreaterThanOrEqual(0);
      expect(result.activity.peakHour).toBeLessThan(24);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });
});
