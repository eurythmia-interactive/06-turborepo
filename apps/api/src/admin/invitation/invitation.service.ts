import { Inject, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient, Role } from '@repo/database';
import { EmailService } from '../../common/email/email.service.js';
import { AuditService } from '../services/audit.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvitationService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async createInvitation(
    email: string,
    tenantId: string | undefined,
    role: Role,
    invitedBy: string,
    ip?: string,
    userAgent?: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvitation) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.userInvitation.create({
      data: {
        email,
        token,
        tenantId: tenantId ?? null,
        role,
        invitedBy,
        expiresAt,
      },
    });

    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    const invitationLink = `${webUrl}/invite/${token}`;

    let tenantName = 'our platform';
    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) tenantName = tenant.name;
    }

    const inviter = await this.prisma.user.findUnique({ where: { id: invitedBy } });
    const inviterName = inviter?.name || '';

    await this.emailService.sendInvitation(email, invitationLink, tenantName, inviterName);

    await this.auditService.log({
      userId: invitedBy,
      action: 'invitation.created',
      details: { email, tenantId, role },
      ip,
      userAgent,
    });

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new ConflictException('Invitation already accepted');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ConflictException('Invitation has expired');
    }

    await this.prisma.$transaction([
      this.prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
      this.prisma.userTenant.create({
        data: {
          userId,
          tenantId: invitation.tenantId!,
          role: invitation.role,
        },
      }),
    ]);

    await this.auditService.log({
      userId,
      action: 'invitation.accepted',
      details: { invitationId: invitation.id },
    });

    return { success: true };
  }

  async getInvitations(tenantId?: string, status?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    if (status) {
      if (status === 'expired') {
        where.expiresAt = { lt: new Date() };
        where.acceptedAt = null;
      } else if (status === 'pending') {
        where.expiresAt = { gt: new Date() };
        where.acceptedAt = null;
      } else if (status === 'accepted') {
        where.acceptedAt = { not: null };
      } else if (status === 'canceled') {
        where.expiresAt = { lt: new Date() };
        where.acceptedAt = null;
      }
    }

    const invitations = await this.prisma.userInvitation.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true } },
        invitedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      ...inv,
      status: this.getInvitationStatus(inv),
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      acceptedAt: inv.acceptedAt?.toISOString() ?? null,
    }));
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
      include: {
        tenant: { select: { name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return {
      ...invitation,
      status: this.getInvitationStatus(invitation),
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    };
  }

  async resendInvitation(invitationId: string, userId: string, ip?: string, userAgent?: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new ConflictException('Invitation already accepted');
    }

    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    const invitationLink = `${webUrl}/invite/${invitation.token}`;

    let tenantName = 'our platform';
    if (invitation.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: invitation.tenantId },
      });
      if (tenant) tenantName = tenant.name;
    }

    const inviter = await this.prisma.user.findUnique({
      where: { id: invitation.invitedBy },
    });
    const inviterName = inviter?.name || '';

    await this.emailService.sendInvitation(
      invitation.email,
      invitationLink,
      tenantName,
      inviterName,
    );

    await this.auditService.log({
      userId,
      action: 'invitation.resend',
      details: { invitationId },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async cancelInvitation(invitationId: string, userId: string, ip?: string, userAgent?: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.userInvitation.update({
      where: { id: invitationId },
      data: { expiresAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'invitation.canceled',
      details: { invitationId },
      ip,
      userAgent,
    });

    return { success: true };
  }

  private getInvitationStatus(invitation: {
    acceptedAt: Date | null;
    expiresAt: Date;
  }): 'pending' | 'accepted' | 'expired' | 'canceled' {
    if (invitation.acceptedAt) return 'accepted';
    if (invitation.expiresAt < new Date()) return 'expired';
    return 'pending';
  }
}
