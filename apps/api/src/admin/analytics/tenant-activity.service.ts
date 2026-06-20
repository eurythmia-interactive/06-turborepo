import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { DashboardCacheService } from './dashboard-cache.service.js';
import type { Period, ActivityResponse } from '@repo/shared';

interface ActivityDataPoint {
  timestamp: string;
  value: number;
  label: string;
}

@Injectable()
export class TenantActivityService {
  private readonly logger = new Logger(TenantActivityService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly cacheService: DashboardCacheService,
  ) {}

  async getActivity(
    type: 'sessions' | 'users',
    period: Period,
    limit?: number,
  ): Promise<ActivityResponse> {
    const effectiveLimit = limit ?? (period === 'day' ? 24 : period === 'week' ? 7 : 30);
    const cacheKey = `activity:${type}:${period}:${effectiveLimit}`;
    const cached = this.cacheService.get<ActivityResponse>(cacheKey);
    if (cached) return cached;

    let result: ActivityResponse;
    if (type === 'sessions') {
      result = await this.getSessionActivity(period, effectiveLimit);
    } else {
      result = await this.getUserActivity(period, effectiveLimit);
    }

    this.cacheService.set(cacheKey, result);
    return result;
  }

  private async getSessionActivity(period: Period, limit: number): Promise<ActivityResponse> {
    const startDate = this.getStartDate(period, limit);
    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: 'auth.login',
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = this.bucketByPeriod(
      logs.map((l) => l.createdAt),
      period,
      limit,
    );

    const data: ActivityDataPoint[] = buckets.map((b) => ({
      timestamp: b.label,
      value: b.count,
      label: b.displayLabel,
    }));

    return this.buildResponse('sessions', period, data);
  }

  private async getUserActivity(period: Period, limit: number): Promise<ActivityResponse> {
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

    const data: ActivityDataPoint[] = buckets.map((b) => ({
      timestamp: b.label,
      value: b.count,
      label: b.displayLabel,
    }));

    return this.buildResponse('users', period, data);
  }

  private bucketByPeriod(
    dates: Date[],
    period: Period,
    limit: number,
  ): { label: string; displayLabel: string; count: number }[] {
    const buckets: Map<string, { displayLabel: string; count: number }> = new Map();
    const startDate = this.getStartDate(period, limit);

    for (let i = 0; i < limit; i++) {
      const d = new Date(startDate);
      if (period === 'day') {
        d.setHours(d.getHours() + i);
        const label = d.toISOString();
        const displayLabel = `${String(d.getHours()).padStart(2, '0')}:00`;
        buckets.set(label, { displayLabel, count: 0 });
      } else if (period === 'week') {
        d.setDate(d.getDate() + i);
        const label = d.toISOString().split('T')[0]!;
        const displayLabel = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        buckets.set(label, { displayLabel, count: 0 });
      } else {
        d.setDate(d.getDate() + i);
        const label = d.toISOString().split('T')[0]!;
        const displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets.set(label, { displayLabel, count: 0 });
      }
    }

    for (const date of dates) {
      let key: string;
      if (period === 'day') {
        const d = new Date(date);
        d.setMinutes(0, 0, 0);
        key = d.toISOString();
      } else {
        key = date.toISOString().split('T')[0]!;
      }
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count++;
      }
    }

    return Array.from(buckets.entries()).map(([label, { displayLabel, count }]) => ({
      label,
      displayLabel,
      count,
    }));
  }

  private getStartDate(period: Period, limit: number): Date {
    const now = new Date();

    if (period === 'day') {
      const start = new Date(now);
      start.setHours(start.getHours() - limit + 1, 0, 0, 0);
      return start;
    } else if (period === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - limit + 1);
      start.setHours(0, 0, 0, 0);
      return start;
    } else {
      const start = new Date(now);
      start.setDate(start.getDate() - limit + 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
  }

  private buildResponse(type: string, period: string, data: ActivityDataPoint[]): ActivityResponse {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const average = data.length > 0 ? Math.round((total / data.length) * 10) / 10 : 0;
    const peak = data.reduce(
      (max, d) => (d.value > max.value ? { timestamp: d.timestamp, value: d.value } : max),
      { timestamp: data[0]?.timestamp ?? '', value: 0 },
    );

    return {
      type,
      period,
      data,
      summary: {
        total,
        average,
        peak,
      },
    };
  }
}
