import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDashboardMetricsAction,
  getGrowthDataAction,
  getActivityDataAction,
  getRecentActivityAction,
} from '@/actions/dashboard';

vi.mock('@/lib/server-api-client', () => ({
  serverApiClient: {
    get: vi.fn(),
  },
}));

import { serverApiClient } from '@/lib/server-api-client';

const mockGet = vi.mocked(serverApiClient.get);

describe('Dashboard Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardMetricsAction', () => {
    it('returns success with metrics data', async () => {
      const mockMetrics = {
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
        activity: {
          totalSessionsToday: 50,
          activeTenantsToday: 5,
          peakHour: 14,
          trend: 5,
        },
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z',
          label: 'Last 30 days',
        },
      };

      mockGet.mockResolvedValue(mockMetrics);

      const result = await getDashboardMetricsAction('month');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetrics);
      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/dashboard/metrics?timeRange=month');
    });

    it('uses default timeRange when not provided', async () => {
      mockGet.mockResolvedValue({});

      await getDashboardMetricsAction();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/dashboard/metrics?timeRange=month');
    });

    it('returns error message on failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await getDashboardMetricsAction('month');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  describe('getGrowthDataAction', () => {
    it('returns success with growth data', async () => {
      const mockGrowth = {
        metric: 'users',
        period: 'day',
        data: [
          { date: '2024-01-01', new: 5, cumulative: 100, growthRate: 5 },
          { date: '2024-01-02', new: 3, cumulative: 103, growthRate: 3 },
        ],
        summary: {
          total: 8,
          average: 4,
          peak: { date: '2024-01-01', value: 5 },
          growth: 3,
        },
      };

      mockGet.mockResolvedValue(mockGrowth);

      const result = await getGrowthDataAction('users', 'day', 30);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGrowth);
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/admin/dashboard/growth?metric=users&period=day&limit=30',
      );
    });

    it('uses default values when not provided', async () => {
      mockGet.mockResolvedValue({});

      await getGrowthDataAction('users');

      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/admin/dashboard/growth?metric=users&period=day&limit=30',
      );
    });

    it('returns error message on failure', async () => {
      mockGet.mockRejectedValue(new Error('Failed to fetch'));

      const result = await getGrowthDataAction('users', 'day', 30);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to fetch');
    });
  });

  describe('getActivityDataAction', () => {
    it('returns success with activity data', async () => {
      const mockActivity = {
        type: 'sessions',
        period: 'day',
        data: [
          { timestamp: '2024-01-01T00:00:00.000Z', value: 5, label: '00:00' },
          { timestamp: '2024-01-01T01:00:00.000Z', value: 3, label: '01:00' },
        ],
        summary: {
          total: 8,
          average: 4,
          peak: { timestamp: '2024-01-01T00:00:00.000Z', value: 5 },
        },
      };

      mockGet.mockResolvedValue(mockActivity);

      const result = await getActivityDataAction('sessions', 'day');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockActivity);
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/admin/dashboard/activity?type=sessions&period=day',
      );
    });

    it('includes limit when provided', async () => {
      mockGet.mockResolvedValue({});

      await getActivityDataAction('sessions', 'day', 12);

      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/admin/dashboard/activity?type=sessions&period=day&limit=12',
      );
    });

    it('returns error message on failure', async () => {
      mockGet.mockRejectedValue(new Error('Server error'));

      const result = await getActivityDataAction('sessions', 'day');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Server error');
    });
  });

  describe('getRecentActivityAction', () => {
    it('returns success with recent activity', async () => {
      const mockRecent = {
        events: [
          {
            id: '1',
            action: 'auth.login',
            user: { id: 'u1', name: 'John', email: 'john@example.com' },
            tenant: { id: 't1', name: 'Acme', slug: 'acme' },
            timestamp: '2024-01-01T12:00:00.000Z',
            timeAgo: '5m ago',
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockGet.mockResolvedValue(mockRecent);

      const result = await getRecentActivityAction(10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecent);
      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/dashboard/recent?limit=10');
    });

    it('includes type filter when provided', async () => {
      mockGet.mockResolvedValue({ events: [], total: 0, hasMore: false });

      await getRecentActivityAction(20, 'auth');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/dashboard/recent?limit=20&type=auth');
    });

    it('uses default limit when not provided', async () => {
      mockGet.mockResolvedValue({ events: [], total: 0, hasMore: false });

      await getRecentActivityAction();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/dashboard/recent?limit=20');
    });

    it('returns error message on failure', async () => {
      mockGet.mockRejectedValue(new Error('Timeout'));

      const result = await getRecentActivityAction(10);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Timeout');
    });
  });
});
