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
import type { CreateUserInput, UpdateUserInput, UserListQuery } from '@repo/shared';

@Injectable()
export class UserAdminService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: UserListQuery) {
    const { page, limit, search, tenantId, role, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tenantId) {
      where.tenants = { some: { tenantId } };
    }

    if (role) {
      where.role = role;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else if (sortBy === 'lastLoginAt') {
      orderBy.lastLoginAt = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          status: true,
          role: true,
          isSystem: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          tenants: {
            select: {
              tenantId: true,
              role: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        status: true,
        role: true,
        isSystem: true,
        lastLoginAt: true,
        deletedAt: true,
        deletedBy: true,
        createdAt: true,
        updatedAt: true,
        tenants: {
          select: {
            tenantId: true,
            role: true,
            createdAt: true,
            tenant: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const recentAuditLogs = await this.prisma.auditLog.findMany({
      where: { userId: id },
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        details: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        tenantId: true,
      },
    });

    return {
      ...user,
      recentAuditLogs,
    };
  }

  async create(data: CreateUserInput, adminUserId: string, ip?: string, userAgent?: string) {
    const { email, name, password, tenantId, role } = data;

    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.suspended) {
      throw new ForbiddenException('Cannot add user to suspended tenant');
    }

    const passwordHash = await hash(password);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          status: UserStatus.ACTIVE,
          role: Role.MEMBER,
          providers: {
            create: {
              type: AuthProviderType.LOCAL,
              providerUserId: email.toLowerCase(),
              passwordHash,
            },
          },
          tenants: {
            create: {
              tenantId,
              role: role as Role,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          role: true,
          isSystem: true,
          createdAt: true,
          updatedAt: true,
          tenants: {
            select: {
              tenantId: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      return newUser;
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.created',
      details: {
        userId: user.id,
        userEmail: user.email,
        tenantId,
        role,
      },
      ip,
      userAgent,
    });

    return user;
  }

  async update(
    id: string,
    data: UpdateUserInput,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSystem) {
      throw new ForbiddenException('Cannot update system user');
    }

    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email.toLowerCase() }),
        ...(data.role !== undefined && { role: data.role as Role }),
        ...(data.status !== undefined && { status: data.status as UserStatus }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true,
        isSystem: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        tenants: {
          select: {
            tenantId: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.updated',
      details: { userId: id, changes: data },
      ip,
      userAgent,
    });

    return updatedUser;
  }

  async softDelete(id: string, deletedBy: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (id === deletedBy) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    if (user.isSystem) {
      throw new ForbiddenException('Cannot delete system user');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        status: UserStatus.SUSPENDED,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true },
    });

    await this.auditService.log({
      userId: deletedBy,
      action: 'user.deleted',
      details: { userId: id, userEmail: user.email, method: 'soft' },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async suspend(id: string, reason: string, adminUserId: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (id === adminUserId) {
      throw new ForbiddenException('Cannot suspend yourself');
    }

    if (user.isSystem) {
      throw new ForbiddenException('Cannot suspend system user');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ConflictException('User is already suspended');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { status: UserStatus.SUSPENDED },
      });

      await tx.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      });

      await tx.apiKey.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      });
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.suspended',
      details: { userId: id, userEmail: user.email, reason },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async activate(id: string, adminUserId: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.SUSPENDED) {
      throw new ConflictException('User is not suspended');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.activated',
      details: { userId: id, userEmail: user.email },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async forcePasswordReset(id: string, adminUserId: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { providers: { where: { type: AuthProviderType.LOCAL } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (id === adminUserId) {
      throw new ForbiddenException('Cannot reset your own password via admin action');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await hash(tempPassword);

    const provider = user.providers[0];
    if (!provider) {
      throw new ConflictException('User does not have a local authentication provider');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.authenticationProvider.update({
        where: { id: provider.id },
        data: { passwordHash },
      });

      await tx.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      });
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.password_reset',
      details: { userId: id, userEmail: user.email },
      ip,
      userAgent,
    });

    return { tempPassword };
  }

  async addToTenant(
    userId: string,
    tenantId: string,
    role: Role,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.suspended) {
      throw new ForbiddenException('Cannot add user to suspended tenant');
    }

    const existing = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this tenant');
    }

    await this.prisma.userTenant.create({
      data: { userId, tenantId, role },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.added_to_tenant',
      details: { userId, tenantId, role, tenantName: tenant.name },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async removeFromTenant(
    userId: string,
    tenantId: string,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!existing) {
      throw new NotFoundException('User is not a member of this tenant');
    }

    const tenantCount = await this.prisma.userTenant.count({
      where: { userId },
    });

    if (tenantCount <= 1) {
      throw new ForbiddenException('Cannot remove user from their last tenant');
    }

    await this.prisma.userTenant.delete({
      where: { userId_tenantId: { userId, tenantId } },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.removed_from_tenant',
      details: { userId, tenantId },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async updateTenantRole(
    userId: string,
    tenantId: string,
    role: Role,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!existing) {
      throw new NotFoundException('User is not a member of this tenant');
    }

    await this.prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { role },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'user.tenant_role_updated',
      details: { userId, tenantId, role, previousRole: existing.role },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async bulkSuspend(
    userIds: string[],
    reason: string,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    let count = 0;

    for (const userId of userIds) {
      try {
        await this.suspend(userId, reason, adminUserId, ip, userAgent);
        count++;
      } catch {
        // Skip users that can't be suspended (self, system, already suspended)
      }
    }

    return { count };
  }

  async bulkActivate(userIds: string[], adminUserId: string, ip?: string, userAgent?: string) {
    let count = 0;

    for (const userId of userIds) {
      try {
        await this.activate(userId, adminUserId, ip, userAgent);
        count++;
      } catch {
        // Skip users that can't be activated
      }
    }

    return { count };
  }

  async bulkDelete(userIds: string[], deletedBy: string, ip?: string, userAgent?: string) {
    let count = 0;

    for (const userId of userIds) {
      try {
        await this.softDelete(userId, deletedBy, ip, userAgent);
        count++;
      } catch {
        // Skip users that can't be deleted (self, system)
      }
    }

    return { count };
  }

  async bulkRoleAssign(
    userIds: string[],
    tenantId: string,
    role: Role,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let count = 0;

    for (const userId of userIds) {
      try {
        const existing = await this.prisma.userTenant.findUnique({
          where: { userId_tenantId: { userId, tenantId } },
        });

        if (existing) {
          await this.updateTenantRole(userId, tenantId, role, adminUserId, ip, userAgent);
        } else {
          await this.addToTenant(userId, tenantId, role, adminUserId, ip, userAgent);
        }
        count++;
      } catch {
        // Skip users that fail
      }
    }

    return { count };
  }

  private generateTempPassword(): string {
    return randomBytes(12).toString('base64url');
  }
}
