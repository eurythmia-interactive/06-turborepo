import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AllPermissions } from '@repo/shared';
import type { PrismaClient } from '@repo/database';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import { AuditService } from '../services/audit.service.js';
import { PermissionCacheService } from '../../auth/permission-cache.service.js';

interface RoleListParams {
  page: number;
  limit: number;
  search?: string;
  includeSystem?: boolean;
}

interface CreateRoleData {
  name: string;
  description?: string;
  permissions: string[];
}

interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
}

interface DeleteOptions {
  reassignTo?: string;
}

@Injectable()
export class RoleAdminService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly auditService: AuditService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  async findAll(params: RoleListParams) {
    const { page, limit, search, includeSystem } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (!includeSystem) {
      where.isSystem = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customRole.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true, userTenants: true },
          },
        },
      }),
      this.prisma.customRole.count({ where }),
    ]);

    const roles = data.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      userCount: role._count.users + role._count.userTenants,
      createdAt: role.createdAt,
    }));

    return {
      data: roles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const role = await this.prisma.customRole.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, userTenants: true },
        },
        users: {
          take: 10,
          select: { id: true, name: true, email: true },
        },
        userTenants: {
          take: 10,
          include: {
            user: { select: { id: true, name: true, email: true } },
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      userCount: role._count.users + role._count.userTenants,
      createdAt: role.createdAt,
      users: role.users,
      userTenants: role.userTenants.map((ut) => ({
        id: ut.user.id,
        name: ut.user.name,
        email: ut.user.email,
        tenantId: ut.tenantId,
        tenantName: ut.tenant.name,
      })),
    };
  }

  async findByName(name: string) {
    const role = await this.prisma.customRole.findUnique({
      where: { name },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
    };
  }

  async create(data: CreateRoleData, adminUserId: string, ip?: string, userAgent?: string) {
    const existing = await this.prisma.customRole.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException('Role name already exists');
    }

    this.validatePermissions(data.permissions);

    const role = await this.prisma.customRole.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: false,
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'role.created',
      details: { roleId: role.id, name: role.name, permissions: role.permissions },
      ip,
      userAgent,
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
    };
  }

  async update(
    id: string,
    data: UpdateRoleData,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const role = await this.prisma.customRole.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (data.name && data.name !== role.name) {
      const existing = await this.prisma.customRole.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new ConflictException('Role name already exists');
      }
    }

    if (data.permissions) {
      this.validatePermissions(data.permissions);
    }

    const updated = await this.prisma.customRole.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.permissions !== undefined && { permissions: data.permissions }),
      },
    });

    if (data.permissions) {
      this.cacheService.invalidateRole(id);
    }

    await this.auditService.log({
      userId: adminUserId,
      action: 'role.updated',
      details: { roleId: id, changes: data },
      ip,
      userAgent,
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      permissions: updated.permissions,
      isSystem: updated.isSystem,
      createdAt: updated.createdAt,
    };
  }

  async delete(
    id: string,
    options: DeleteOptions,
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const role = await this.prisma.customRole.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, userTenants: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete system role');
    }

    const totalUsers = role._count.users + role._count.userTenants;

    if (totalUsers > 0 && !options.reassignTo) {
      throw new UnprocessableEntityException(
        `Role has ${totalUsers} users assigned. Provide reassignTo or force delete.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (options.reassignTo) {
        const newRole = await tx.customRole.findUnique({
          where: { id: options.reassignTo },
        });

        if (!newRole) {
          throw new NotFoundException('Reassignment role not found');
        }

        await tx.user.updateMany({
          where: { customRoleId: id },
          data: { customRoleId: options.reassignTo },
        });

        await tx.userTenant.updateMany({
          where: { customRoleId: id },
          data: { customRoleId: options.reassignTo },
        });
      } else {
        await tx.user.updateMany({
          where: { customRoleId: id },
          data: { customRoleId: null },
        });

        await tx.userTenant.updateMany({
          where: { customRoleId: id },
          data: { customRoleId: null },
        });
      }

      await tx.customRole.delete({ where: { id } });
    });

    this.cacheService.invalidateRole(id);

    await this.auditService.log({
      userId: adminUserId,
      action: 'role.deleted',
      details: { roleId: id, name: role.name, reassignedTo: options.reassignTo ?? null },
      ip,
      userAgent,
    });

    return { success: true, message: 'Role deleted successfully' };
  }

  async assignPermissions(
    id: string,
    permissions: string[],
    adminUserId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const role = await this.prisma.customRole.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    this.validatePermissions(permissions);

    const updated = await this.prisma.customRole.update({
      where: { id },
      data: { permissions },
    });

    this.cacheService.invalidateRole(id);

    await this.auditService.log({
      userId: adminUserId,
      action: 'role.permissions_assigned',
      details: { roleId: id, permissions },
      ip,
      userAgent,
    });

    return {
      id: updated.id,
      name: updated.name,
      permissions: updated.permissions,
    };
  }

  private validatePermissions(permissions: string[]) {
    const invalid = permissions.filter((p) => !AllPermissions.includes(p as never));
    if (invalid.length > 0) {
      throw new ConflictException(`Invalid permissions: ${invalid.join(', ')}`);
    }
  }
}
