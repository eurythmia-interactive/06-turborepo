import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient, UserStatus, Role } from '@repo/database';
import { AuditService } from '../services/audit.service.js';
import { DashboardCacheService } from './dashboard-cache.service.js';
import type { TimeRange, DashboardMetricsResponse } from '@repo/shared';

@Injectable()
export class MetricsAggregationService {
  private readonly logger = new Logger(MetricsAggregationService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly auditService: AuditService,
    private readonly cacheService: DashboardCacheService,
  ) {}

  async getMetrics(timeRange: TimeRange): Promise<DashboardMetricsResponse> {
    const cacheKey = `metrics:${timeRange}`;
    const cached = this.cacheService.get<DashboardMetricsResponse>(cacheKey);
    if (cached) return cached;

    const { start, end, label } = this.getTimeRangeBounds(timeRange);
    const prevStart = new Date(start);
    prevStart.setDate(
      prevStart.getDate() - (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    const [
      totalUsers,
      activeUsers,
      newUsersInRange,
      newUsersPrevRange,
      newUsersToday,
      newUsersThisWeek,
      usersByStatus,
      usersByRole,
      totalTenants,
      activeTenants,
      newTenantsToday,
      newTenantsThisWeek,
      suspendedTenants,
      tenantUserCounts,
      sessionsToday,
      activeTenantsToday,
      peakHour,
      prevSessions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: prevStart, lt: start } },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: this.getStartOfDay(new Date()) },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.getUsersByStatus(),
      this.getUsersByRole(),
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { deletedAt: null, suspended: false } }),
      this.prisma.tenant.count({
        where: { deletedAt: null, createdAt: { gte: this.getStartOfDay(new Date()) } },
      }),
      this.prisma.tenant.count({
        where: {
          deletedAt: null,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.tenant.count({ where: { deletedAt: null, suspended: true } }),
      this.prisma.userTenant.count(),
      this.prisma.auditLog.count({
        where: {
          action: 'auth.login',
          createdAt: { gte: this.getStartOfDay(new Date()) },
        },
      }),
      this.getActiveTenantsToday(),
      this.getPeakActivityHour(),
      this.prisma.auditLog.count({
        where: {
          action: 'auth.login',
          createdAt: {
            gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            lt: this.getStartOfDay(new Date()),
          },
        },
      }),
    ]);

    const avgUsersPerTenant = totalTenants > 0 ? Math.round(tenantUserCounts / totalTenants) : 0;
    const userGrowth = this.calculateGrowthRate(newUsersInRange, newUsersPrevRange);
    const sessionTrend = this.calculateGrowthRate(sessionsToday, prevSessions);

    const result: DashboardMetricsResponse = {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        growth: userGrowth,
        byStatus: usersByStatus,
        byRole: usersByRole,
      },
      tenants: {
        total: totalTenants,
        active: activeTenants,
        newToday: newTenantsToday,
        newThisWeek: newTenantsThisWeek,
        suspended: suspendedTenants,
        avgUsersPerTenant,
      },
      activity: {
        totalSessionsToday: sessionsToday,
        activeTenantsToday,
        peakHour,
        trend: sessionTrend,
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label,
      },
    };

    this.cacheService.set(cacheKey, result);
    return result;
  }

  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private async getUsersByStatus(): Promise<{
    ACTIVE: number;
    SUSPENDED: number;
    PENDING: number;
  }> {
    const result = await this.prisma.user.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const counts: Record<string, number> = { ACTIVE: 0, SUSPENDED: 0, PENDING: 0 };
    for (const row of result) {
      counts[row.status] = row._count.id;
    }
    return counts as { ACTIVE: number; SUSPENDED: number; PENDING: number };
  }

  private async getUsersByRole(): Promise<{
    SUPER_ADMIN: number;
    ADMIN: number;
    MEMBER: number;
    GUEST: number;
  }> {
    const result = await this.prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const counts: Record<string, number> = { SUPER_ADMIN: 0, ADMIN: 0, MEMBER: 0, GUEST: 0 };
    for (const row of result) {
      counts[row.role] = row._count.id;
    }
    return counts as {
      SUPER_ADMIN: number;
      ADMIN: number;
      MEMBER: number;
      GUEST: number;
    };
  }

  private async getActiveTenantsToday(): Promise<number> {
    const startOfToday = this.getStartOfDay(new Date());
    const logs = await this.prisma.auditLog.findMany({
      where: { createdAt: { gte: startOfToday } },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });
    return logs.filter((l) => l.tenantId !== null).length;
  }

  private async getPeakActivityHour(): Promise<number> {
    const startOfToday = this.getStartOfDay(new Date());
    const logs = await this.prisma.auditLog.findMany({
      where: { createdAt: { gte: startOfToday } },
      select: { createdAt: true },
    });

    const hourCounts = new Array(24).fill(0);
    for (const log of logs) {
      hourCounts[new Date(log.createdAt).getHours()]++;
    }

    let peakHour = 0;
    let maxCount = 0;
    for (let i = 0; i < 24; i++) {
      if (hourCounts[i] > maxCount) {
        maxCount = hourCounts[i];
        peakHour = i;
      }
    }
    return peakHour;
  }

  private getTimeRangeBounds(timeRange: TimeRange): { start: Date; end: Date; label: string } {
    const now = new Date();
    const end = now;
    let start = new Date(now);
    let label = 'Last 30 days';

    switch (timeRange) {
      case 'today':
        start = this.getStartOfDay(now);
        label = 'Today';
        break;
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        label = 'Last 7 days';
        break;
      case 'month':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        label = 'Last 30 days';
        break;
      case 'quarter':
        start = new Date(now);
        start.setDate(start.getDate() - 90);
        label = 'Last 90 days';
        break;
      case 'year':
        start = new Date(now);
        start.setDate(start.getDate() - 365);
        label = 'Last 365 days';
        break;
      case 'all':
        start = new Date('2020-01-01');
        label = 'All time';
        break;
    }

    return { start, end, label };
  }

  private getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
