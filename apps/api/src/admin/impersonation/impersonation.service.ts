import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { TokenPayloadFactory } from '../../auth/utilities/token-payload.factory.js';
import { AuditService } from '../services/audit.service.js';

interface ActiveImpersonation {
  targetUserId: string;
  expiresAt: Date;
}

@Injectable()
export class ImpersonationService {
  private activeImpersonations = new Map<string, ActiveImpersonation>();

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly tokenPayloadFactory: TokenPayloadFactory,
    private readonly auditService: AuditService,
  ) {}

  async startImpersonation(
    adminUserId: string,
    targetUserId: string,
    reason: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    if (adminUserId === targetUserId) {
      throw new BadRequestException('Cannot impersonate yourself');
    }

    if (this.activeImpersonations.has(adminUserId)) {
      throw new BadRequestException(
        'Already impersonating a user. Stop current impersonation first.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { tenants: { take: 1 } },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot impersonate a SUPER_ADMIN');
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const userTenant = targetUser.tenants[0];
    const accessToken = await this.tokenPayloadFactory.signAccessToken(
      targetUserId,
      userTenant?.tenantId || '',
      targetUser.role,
      targetUser.status,
      undefined,
      adminUserId,
    );

    this.activeImpersonations.set(adminUserId, { targetUserId, expiresAt });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.impersonation_started',
      details: { targetUserId, reason },
      ip,
      userAgent,
    });

    return { accessToken, expiresAt };
  }

  async stopImpersonation(
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ success: true }> {
    this.activeImpersonations.delete(adminUserId);

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.impersonation_stopped',
      ip,
      userAgent,
    });

    return { success: true };
  }

  async getStatus(adminUserId: string): Promise<{
    isImpersonating: boolean;
    targetUser?: { id: string; name: string | null; email: string };
    expiresAt?: Date;
  }> {
    const impersonation = this.activeImpersonations.get(adminUserId);

    if (!impersonation) {
      return { isImpersonating: false };
    }

    if (impersonation.expiresAt < new Date()) {
      this.activeImpersonations.delete(adminUserId);
      return { isImpersonating: false };
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: impersonation.targetUserId },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      this.activeImpersonations.delete(adminUserId);
      return { isImpersonating: false };
    }

    return {
      isImpersonating: true,
      targetUser,
      expiresAt: impersonation.expiresAt,
    };
  }
}
