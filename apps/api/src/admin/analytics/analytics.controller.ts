import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@repo/database';
import {
  activityQuerySchema,
  dashboardMetricsQuerySchema,
  growthQuerySchema,
  recentActivityQuerySchema,
} from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { MetricsAggregationService } from './metrics-aggregation.service.js';
import { UserGrowthService } from './user-growth.service.js';
import { TenantActivityService } from './tenant-activity.service.js';
import { Inject } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient } from '@repo/database';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AnalyticsController {
  constructor(
    private readonly metricsService: MetricsAggregationService,
    private readonly growthService: UserGrowthService,
    private readonly activityService: TenantActivityService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  @Get('metrics')
  @Permissions('admin:access')
  async getMetrics(@Query(new ZodValidationPipe(dashboardMetricsQuerySchema)) query: any) {
    return this.metricsService.getMetrics(query.timeRange);
  }

  @Get('growth')
  @Permissions('admin:access')
  async getGrowth(@Query(new ZodValidationPipe(growthQuerySchema)) query: any) {
    return this.growthService.getGrowth(query.metric, query.period, query.limit);
  }

  @Get('activity')
  @Permissions('admin:access')
  async getActivity(@Query(new ZodValidationPipe(activityQuerySchema)) query: any) {
    return this.activityService.getActivity(query.type, query.period, query.limit);
  }

  @Get('recent')
  @Permissions('admin:access')
  async getRecent(@Query(new ZodValidationPipe(recentActivityQuerySchema)) query: any) {
    const { limit, type } = query;

    const where: any = {};
    if (type) {
      where.action = { contains: type, mode: 'insensitive' };
    }

    const [events, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const hasMore = events.length > limit;
    const trimmed = hasMore ? events.slice(0, limit) : events;

    return {
      events: trimmed.map((event) => ({
        id: event.id,
        action: event.action,
        user: {
          id: event.user.id,
          name: event.user.name,
          email: event.user.email,
        },
        tenant: event.tenant
          ? {
              id: event.tenant.id,
              name: event.tenant.name,
              slug: event.tenant.slug,
            }
          : null,
        details: event.details as Record<string, unknown> | null,
        ip: event.ip,
        userAgent: event.userAgent,
        timestamp: event.createdAt.toISOString(),
        timeAgo: this.formatTimeAgo(event.createdAt),
      })),
      total,
      hasMore,
    };
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
