import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'argon2';
import { randomBytes } from 'node:crypto';
import { AuthProviderType, Role, UserStatus, type PrismaClient } from '@repo/database';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import { AuditService } from '../services/audit.service.js';
import type {
  CreateTenantInput,
  SuspendTenantInput,
  TenantListQuery,
  UpdateTenantInput,
} from '@repo/shared';

@Injectable()
export class TenantAdminService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: TenantListQuery) {
    const { page, limit, search, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status === 'active') {
      where.deletedAt = null;
      where.suspended = false;
    } else if (status === 'suspended') {
      where.deletedAt = null;
      where.suspended = true;
    } else if (status === 'deleted') {
      where.deletedAt = { not: null };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'userCount') {
      orderBy._count = { users: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { users: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
              },
            },
          },
        },
        _count: { select: { users: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const recentAuditLogs = await this.prisma.auditLog.findMany({
      where: { tenantId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return {
      ...tenant,
      recentAuditLogs,
    };
  }

  async create(data: CreateTenantInput, adminUserId: string, ip?: string, userAgent?: string) {
    const { name, slug, adminEmail, plan } = data;

    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Tenant slug already exists');
    }

    let tempPassword: string | undefined;
    let adminUser: { id: string; email: string; name: string | null } | null = null;

    if (adminEmail) {
      adminUser = await this.prisma.user.findUnique({
        where: { email: adminEmail.toLowerCase() },
        select: { id: true, email: true, name: true },
      });

      if (!adminUser) {
        tempPassword = this.generateTempPassword();
        const passwordHash = await hash(tempPassword);

        adminUser = await this.prisma.user.create({
          data: {
            email: adminEmail.toLowerCase(),
            name: 'Admin',
            status: UserStatus.ACTIVE,
            role: Role.ADMIN,
            providers: {
              create: {
                type: AuthProviderType.LOCAL,
                providerUserId: adminEmail.toLowerCase(),
                passwordHash,
              },
            },
          },
          select: { id: true, email: true, name: true },
        });
      }
    }

    const tenant = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug,
          plan: plan ?? 'free',
          users: adminUser
            ? {
                create: { userId: adminUser.id },
              }
            : undefined,
        },
        include: {
          _count: { select: { users: true } },
        },
      });

      return newTenant;
    });

    await this.auditService.log({
      userId: adminUserId,
      tenantId: tenant.id,
      action: 'tenant.created',
      details: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        adminEmail: adminEmail ?? null,
        adminUserId: adminUser?.id ?? null,
      },
      ip,
      userAgent,
    });

    return {
      tenant,
      tempPassword,
      adminUser: adminUser
        ? {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
          }
        : null,
    };
  }

  async update(
    id: string,
    data: UpdateTenantInput,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.isSystem) {
      throw new ForbiddenException('Cannot update system tenant');
    }

    if (data.slug && data.slug !== tenant.slug) {
      const existing = await this.prisma.tenant.findUnique({ where: { slug: data.slug } });
      if (existing) {
        throw new ConflictException('Tenant slug already exists');
      }
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.plan !== undefined && { plan: data.plan }),
      },
      include: {
        _count: { select: { users: true } },
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      tenantId: id,
      action: 'tenant.updated',
      details: { changes: data },
      ip,
      userAgent,
    });

    return updatedTenant;
  }

  async softDelete(id: string, deletedBy: string, ip?: string, userAgent?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.isSystem) {
      throw new ForbiddenException('Cannot delete system tenant');
    }

    await this.prisma.tenant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });

    await this.auditService.log({
      userId: deletedBy,
      tenantId: id,
      action: 'tenant.deleted',
      details: { tenantId: id, tenantName: tenant.name, method: 'soft' },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async suspend(
    id: string,
    data: SuspendTenantInput,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.isSystem) {
      throw new ForbiddenException('Cannot suspend system tenant');
    }

    if (tenant.suspended) {
      throw new ConflictException('Tenant is already suspended');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id },
        data: { suspended: true },
      });

      await tx.user.updateMany({
        where: {
          tenants: { some: { tenantId: id } },
        },
        data: { status: UserStatus.SUSPENDED },
      });

      const userIds = await tx.userTenant.findMany({
        where: { tenantId: id },
        select: { userId: true },
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: { in: userIds.map((ut) => ut.userId) },
          revoked: false,
        },
        data: { revoked: true },
      });
    });

    await this.auditService.log({
      userId: adminUserId,
      tenantId: id,
      action: 'tenant.suspended',
      details: {
        tenantId: id,
        tenantName: tenant.name,
        reason: data.reason,
      },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async restore(id: string, adminUserId: string, ip?: string, userAgent?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.suspended) {
      throw new ConflictException('Tenant is not suspended');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id },
        data: { suspended: false },
      });

      await tx.user.updateMany({
        where: {
          tenants: { some: { tenantId: id } },
          status: UserStatus.SUSPENDED,
        },
        data: { status: UserStatus.ACTIVE },
      });
    });

    await this.auditService.log({
      userId: adminUserId,
      tenantId: id,
      action: 'tenant.restored',
      details: { tenantId: id, tenantName: tenant.name },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async getStats(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingUsers,
      superAdminCount,
      adminCount,
      memberCount,
      guestCount,
      auditLogCount30Days,
    ] = await Promise.all([
      this.prisma.userTenant.count({ where: { tenantId: id } }),
      this.prisma.user.count({
        where: {
          tenants: { some: { tenantId: id } },
          status: UserStatus.ACTIVE,
        },
      }),
      this.prisma.user.count({
        where: {
          tenants: { some: { tenantId: id } },
          status: UserStatus.SUSPENDED,
        },
      }),
      this.prisma.user.count({
        where: {
          tenants: { some: { tenantId: id } },
          status: UserStatus.PENDING,
        },
      }),
      this.prisma.user.count({
        where: {
          tenants: { some: { tenantId: id } },
          role: Role.SUPER_ADMIN,
        },
      }),
      this.prisma.user.count({
        where: {
          tenants: { some: { tenantId: id } },
          role: Role.ADMIN,
        },
      }),
      this.prisma.user.count({
        where: {
          tenants: { some: { tenantId: id } },
          role: Role.MEMBER,
        },
      }),
      this.prisma.user.count({
        where: {
          tenants: { some: { tenantId: id } },
          role: Role.GUEST,
        },
      }),
      this.prisma.auditLog.count({
        where: {
          tenantId: id,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingUsers,
      usersByRole: {
        SUPER_ADMIN: superAdminCount,
        ADMIN: adminCount,
        MEMBER: memberCount,
        GUEST: guestCount,
      },
      auditLogCount30Days,
    };
  }

  private generateTempPassword(): string {
    return randomBytes(12).toString('base64url');
  }
}
