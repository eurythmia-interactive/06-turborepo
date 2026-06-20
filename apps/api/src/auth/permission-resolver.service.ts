import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { PermissionCacheService } from './permission-cache.service.js';

@Injectable()
export class PermissionResolverService {
  private readonly logger = new Logger(PermissionResolverService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly cacheService: PermissionCacheService,
  ) {}

  async resolveCustomRolePermissions(customRoleId: string): Promise<string[]> {
    this.logger.debug(`Resolving permissions for custom role: ${customRoleId}`);

    let permissions = this.cacheService.getRolePermissions(customRoleId);

    if (!permissions) {
      this.logger.debug(`Cache miss for role ${customRoleId}, fetching from DB`);
      const role = await this.prisma.customRole.findUnique({
        where: { id: customRoleId },
        select: { permissions: true },
      });

      if (!role) {
        this.logger.warn(`Custom role ${customRoleId} not found in database`);
        return [];
      }

      permissions = role.permissions;
      this.cacheService.setRolePermissions(customRoleId, permissions);
      this.logger.debug(`Cached ${permissions.length} permissions for role ${customRoleId}`);
    }

    return permissions;
  }
}
