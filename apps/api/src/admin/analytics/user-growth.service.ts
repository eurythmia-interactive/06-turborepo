import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { DashboardCacheService } from './dashboard-cache.service.js';
import type { Period, GrowthResponse } from '@repo/shared';

interface GrowthDataPoint {
  date: string;
  new: number;
  cumulative: number;
  growthRate: number | null;
}

@Injectable()
export class UserGrowthService {
  private readonly logger = new Logger(UserGrowthService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly cacheService: DashboardCacheService,
  ) {}

  async getGrowth(
    metric: 'users' | 'tenants',
    period: Period,
    limit: number,
  ): Promise<GrowthResponse> {
    const cacheKey = `growth:${metric}:${period}:${limit}`;
    const cached = this.cacheService.get<GrowthResponse>(cacheKey);
    if (cached) return cached;

    let result: GrowthResponse;
    if (metric === 'users') {
      result = await this.getUserGrowth(period, limit);
    } else {
      result = await this.getTenantGrowth(period, limit);
    }

    this.cacheService.set(cacheKey, result);
    return result;
  }

  private async getUserGrowth(period: Period, limit: number): Promise<GrowthResponse> {
    const startDate = this.getStartDate(period, limit);
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = this.bucketByPeriod(
      users.map((u) => u.createdAt),
      period,
      limit,
    );

    let cumulative = await this.prisma.user.count({
      where: { deletedAt: null, createdAt: { lt: startDate } },
    });

    const data: GrowthDataPoint[] = [];
    let prevCumulative = cumulative;

    for (const bucket of buckets) {
      cumulative += bucket.count;
      const growthRate =
        prevCumulative > 0
          ? Math.round(((cumulative - prevCumulative) / prevCumulative) * 1000) / 10
          : bucket.count > 0
            ? 100
            : 0;

      data.push({
        date: bucket.label,
        new: bucket.count,
        cumulative,
        growthRate,
      });
      prevCumulative = cumulative;
    }

    return this.buildResponse('users', period, data);
  }

  private async getTenantGrowth(period: Period, limit: number): Promise<GrowthResponse> {
    const startDate = this.getStartDate(period, limit);
    const tenants = await this.prisma.tenant.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = this.bucketByPeriod(
      tenants.map((t) => t.createdAt),
      period,
      limit,
    );

    let cumulative = await this.prisma.tenant.count({
      where: { deletedAt: null, createdAt: { lt: startDate } },
    });

    const data: GrowthDataPoint[] = [];
    let prevCumulative = cumulative;

    for (const bucket of buckets) {
      cumulative += bucket.count;
      const growthRate =
        prevCumulative > 0
          ? Math.round(((cumulative - prevCumulative) / prevCumulative) * 1000) / 10
          : bucket.count > 0
            ? 100
            : 0;

      data.push({
        date: bucket.label,
        new: bucket.count,
        cumulative,
        growthRate,
      });
      prevCumulative = cumulative;
    }

    return this.buildResponse('tenants', period, data);
  }

  private bucketByPeriod(
    dates: Date[],
    period: Period,
    limit: number,
  ): { label: string; count: number }[] {
    const buckets: Map<string, number> = new Map();
    const startDate = this.getStartDate(period, limit);

    for (let i = 0; i < limit; i++) {
      const d = new Date(startDate);
      if (period === 'day') {
        d.setDate(d.getDate() + i);
      } else if (period === 'week') {
        d.setDate(d.getDate() + i * 7);
      } else {
        d.setMonth(d.getMonth() + i);
      }
      const label = this.formatDateLabel(d, period);
      buckets.set(label, 0);
    }

    for (const date of dates) {
      const label = this.formatDateLabel(date, period);
      const current = buckets.get(label) ?? 0;
      buckets.set(label, current + 1);
    }

    return Array.from(buckets.entries()).map(([label, count]) => ({ label, count }));
  }

  private formatDateLabel(date: Date, period: Period): string {
    if (period === 'day') {
      return date.toISOString().split('T')[0]!;
    } else if (period === 'week') {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().split('T')[0]!;
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  private getStartDate(period: Period, limit: number): Date {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (period === 'day') {
      start.setDate(start.getDate() - limit + 1);
    } else if (period === 'week') {
      start.setDate(start.getDate() - (limit - 1) * 7);
    } else {
      start.setMonth(start.getMonth() - limit + 1);
      start.setDate(1);
    }

    return start;
  }

  private buildResponse(metric: string, period: string, data: GrowthDataPoint[]): GrowthResponse {
    const total = data.reduce((sum, d) => sum + d.new, 0);
    const average = data.length > 0 ? Math.round((total / data.length) * 10) / 10 : 0;
    const peak = data.reduce(
      (max, d) => (d.new > max.value ? { date: d.date, value: d.new } : max),
      { date: data[0]?.date ?? '', value: 0 },
    );

    const firstCumulative = data[0]?.cumulative ?? 0;
    const lastCumulative = data[data.length - 1]?.cumulative ?? 0;
    const growth =
      firstCumulative > 0
        ? Math.round(((lastCumulative - firstCumulative) / firstCumulative) * 1000) / 10
        : lastCumulative > 0
          ? 100
          : 0;

    return {
      metric,
      period,
      data,
      summary: {
        total,
        average,
        peak,
        growth,
      },
    };
  }
}
