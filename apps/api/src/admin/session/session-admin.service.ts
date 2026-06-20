import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { AuditService } from '../services/audit.service.js';
import type { SessionListQuery, DeviceInfo } from '@repo/shared';
import * as UAParser from 'ua-parser-js';

const parser = new UAParser.UAParser();

@Injectable()
export class SessionAdminService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: SessionListQuery) {
    const { page, limit, userId, status, from, to, sortBy, sortOrder } = query;
    const now = new Date();

    const where = this.buildWhere({ userId, status, from, to });

    const [data, total, activeCount, expiredCount, revokedCount] = await Promise.all([
      this.prisma.refreshToken.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.refreshToken.count({ where }),
      this.prisma.refreshToken.count({
        where: { ...where, revoked: false, expiresAt: { gte: now } },
      }),
      this.prisma.refreshToken.count({
        where: { ...where, expiresAt: { lt: now }, revoked: false },
      }),
      this.prisma.refreshToken.count({ where: { ...where, revoked: true } }),
    ]);

    return {
      data: data.map((token) => this.formatSession(token, now)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalActive: activeCount,
        totalExpired: expiredCount,
        totalRevoked: revokedCount,
      },
    };
  }

  async findByUserId(userId: string, query: SessionListQuery) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.findAll({ ...query, userId });
  }

  async revoke(sessionId: string, adminUserId: string) {
    const token = await this.prisma.refreshToken.findUnique({ where: { id: sessionId } });
    if (!token) throw new NotFoundException('Session not found');

    if (token.revoked) {
      return {
        success: true,
        message: 'Session was already revoked',
        revokedAt: new Date().toISOString(),
        affected: { userId: token.userId, sessionId: token.id },
      };
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revoked: true },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'session.revoked',
      details: { sessionId, targetUserId: token.userId },
    });

    return {
      success: true,
      message: 'Session revoked successfully',
      revokedAt: new Date().toISOString(),
      affected: { userId: token.userId, sessionId: token.id },
    };
  }

  async revokeAllForUser(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false, expiresAt: { gte: now } },
      data: { revoked: true },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'session.all_revoked',
      details: { targetUserId: userId, sessionsRevoked: result.count },
    });

    return {
      success: true,
      message: `Revoked ${result.count} session(s)`,
      revokedCount: result.count,
      affected: { userId, sessionsRevoked: result.count },
    };
  }

  async getSummary() {
    const now = new Date();

    const [totalActive, totalExpired, totalRevoked] = await Promise.all([
      this.prisma.refreshToken.count({ where: { revoked: false, expiresAt: { gte: now } } }),
      this.prisma.refreshToken.count({ where: { revoked: false, expiresAt: { lt: now } } }),
      this.prisma.refreshToken.count({ where: { revoked: true } }),
    ]);

    return { totalActive, totalExpired, totalRevoked };
  }

  private buildWhere(query: { userId?: string; status?: string; from?: string; to?: string }) {
    const now = new Date();
    const where: any = {};

    if (query.userId) where.userId = query.userId;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    if (query.status === 'active') {
      where.revoked = false;
      where.expiresAt = { gte: now };
    } else if (query.status === 'expired') {
      where.revoked = false;
      where.expiresAt = { lt: now };
    } else if (query.status === 'revoked') {
      where.revoked = true;
    }

    return where;
  }

  private formatSession(token: any, now: Date) {
    const isExpired = token.expiresAt < now;
    const status = token.revoked ? 'revoked' : isExpired ? 'expired' : 'active';
    const device = this.parseDevice(token.userAgent);

    return {
      id: token.id,
      userId: token.userId,
      user: {
        id: token.user.id,
        name: token.user.name,
        email: token.user.email,
        image: token.user.image,
      },
      ip: token.ip,
      userAgent: token.userAgent,
      device,
      familyId: token.familyId,
      revoked: token.revoked,
      createdAt: token.createdAt.toISOString(),
      expiresAt: token.expiresAt.toISOString(),
      status,
    };
  }

  private parseDevice(userAgent: string | null): DeviceInfo {
    if (!userAgent) return { type: 'unknown', browser: 'Unknown', os: 'Unknown' };

    parser.setUA(userAgent);
    const result = parser.getResult();

    const deviceType = result.device?.type;
    let type: DeviceInfo['type'] = 'desktop';
    if (deviceType === 'mobile') type = 'mobile';
    else if (deviceType === 'tablet') type = 'tablet';

    return {
      type,
      browser: result.browser.name
        ? `${result.browser.name}${result.browser.version ? ' ' + result.browser.version.split('.')[0] : ''}`
        : 'Unknown',
      os: result.os.name
        ? `${result.os.name}${result.os.version ? ' ' + result.os.version.split('.')[0] : ''}`
        : 'Unknown',
    };
  }
}
