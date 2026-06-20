import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient, Prisma } from '@repo/database';
import type { AuditLogQuery, AuditExportQuery } from '@repo/shared';

export interface AuditLogInput {
  userId: string;
  tenantId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

const ACTION_CATEGORIES: Record<string, string[]> = {
  auth: ['auth.login', 'auth.logout', 'auth.failed', 'auth.refresh', 'admin.login'],
  user: [
    'user.created',
    'user.updated',
    'user.deleted',
    'user.suspended',
    'user.activated',
    'user.password_reset',
    'user.restore',
  ],
  tenant: [
    'tenant.created',
    'tenant.updated',
    'tenant.deleted',
    'tenant.suspended',
    'tenant.restored',
  ],
  role: ['role.created', 'role.updated', 'role.deleted', 'role.permissions'],
  session: ['session.created', 'session.revoked', 'session.all_revoked'],
  system: ['system.maintenance_on', 'system.maintenance_off', 'system.config_changed'],
  security: ['security.ip_blocked', 'security.ip_whitelisted', 'security.alert_triggered'],
};

@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId ?? null,
        action: input.action,
        details: input.details ? (input.details as Prisma.InputJsonValue) : undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async findAll(query: AuditLogQuery) {
    const {
      page,
      limit,
      userId,
      tenantId,
      action,
      actionCategory,
      search,
      ip,
      from,
      to,
      sortBy,
      sortOrder,
    } = query;

    const where = this.buildWhere({
      userId,
      tenantId,
      action,
      actionCategory,
      search,
      ip,
      from,
      to,
    });

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!log) return null;

    return {
      ...log,
      createdAt: log.createdAt.toISOString(),
      timeAgo: this.formatTimeAgo(log.createdAt),
    };
  }

  async count(query: Partial<AuditLogQuery>): Promise<number> {
    const where = this.buildWhere(query);
    return this.prisma.auditLog.count({ where });
  }

  async getActionSummary(timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year') {
    const from = this.getTimeRangeStart(timeRange);

    const where = { createdAt: { gte: from } };

    const [total, actionGroups, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { id: true },
      }),
      this.prisma.auditLog.findMany({
        where,
        select: { action: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const byAction: Record<string, number> = {};
    for (const group of actionGroups) {
      byAction[group.action] = group._count.id;
    }

    const byCategory: Record<string, number> = {};
    for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
      let count = 0;
      for (const a of actions) {
        count += byAction[a] ?? 0;
      }
      if (count > 0) byCategory[category] = count;
    }

    const byDayMap = new Map<string, number>();
    for (const log of logs) {
      const day = log.createdAt.toISOString().split('T')[0]!;
      byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
    }
    const byDay = Array.from(byDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { total, byAction, byCategory, byDay };
  }

  async exportLogs(query: AuditExportQuery) {
    const { format, userId, tenantId, action, actionCategory, from, to, limit } = query;

    const where = this.buildWhere({
      userId,
      tenantId,
      action,
      actionCategory,
      from,
      to,
    });

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (format === 'json') {
      return {
        content: JSON.stringify(logs, null, 2),
        contentType: 'application/json',
        filename: `audit-logs-${new Date().toISOString().split('T')[0]}.json`,
      };
    }

    const header = 'Timestamp,User,Email,Action,Tenant,IP,Details';
    const rows = logs.map((log) => {
      const userName = log.user?.name ?? 'Unknown';
      const userEmail = log.user?.email ?? '';
      const tenantName = log.tenant?.name ?? '';
      const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
      return `${log.createdAt.toISOString()},"${userName}","${userEmail}","${log.action}","${tenantName}","${log.ip ?? ''}","${details}"`;
    });

    return {
      content: [header, ...rows].join('\n'),
      contentType: 'text/csv',
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }

  private buildWhere(query: Partial<AuditLogQuery>): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.userId) where.userId = query.userId;
    if (query.tenantId) where.tenantId = query.tenantId;

    if (query.action) {
      where.action = query.action;
    } else if (query.actionCategory) {
      const actions = ACTION_CATEGORIES[query.actionCategory];
      if (actions) {
        where.action = { in: actions };
      }
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { ip: { contains: query.search } },
        { details: { path: [], string_contains: query.search } },
      ];
    }

    if (query.ip) where.ip = query.ip;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    return where;
  }

  private getTimeRangeStart(timeRange: string): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (timeRange) {
      case 'today':
        return now;
      case 'week':
        now.setDate(now.getDate() - 7);
        return now;
      case 'month':
        now.setDate(now.getDate() - 30);
        return now;
      case 'quarter':
        now.setDate(now.getDate() - 90);
        return now;
      case 'year':
        now.setDate(now.getDate() - 365);
        return now;
      default:
        now.setDate(now.getDate() - 30);
        return now;
    }
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
    return date.toISOString().split('T')[0]!;
  }
}
