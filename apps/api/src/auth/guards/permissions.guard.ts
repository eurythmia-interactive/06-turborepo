import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AllPermissions, RolePermissions } from '@repo/shared';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { REQUIRE_ANY_PERMISSION_KEY } from '../decorators/require-any-permission.decorator.js';
import type { AuthenticatedUser } from '../interfaces/token-payload.interface.js';
import { PermissionResolverService } from '../permission-resolver.service.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolverService: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredAnyPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_ANY_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredAnyPermissions || requiredAnyPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    let userPermissions: string[];

    if (user.role === 'SUPER_ADMIN') {
      userPermissions = AllPermissions;
      this.logger.debug(`User ${user.userId} is SUPER_ADMIN, granting all permissions`);
    } else if (user.customRoleId) {
      userPermissions = await this.permissionResolverService.resolveCustomRolePermissions(
        user.customRoleId,
      );
      this.logger.debug(
        `User ${user.userId} has custom role ${user.customRoleId}, resolved ${userPermissions.length} permissions`,
      );
    } else {
      userPermissions = RolePermissions[user.role] ?? [];
      this.logger.debug(
        `User ${user.userId} has enum role ${user.role}, resolved ${userPermissions.length} permissions`,
      );
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((perm) => userPermissions.includes(perm));
      if (!hasAllPermissions) {
        this.logger.warn(
          `User ${user.userId} denied access: missing permissions. Required: ${requiredPermissions.join(', ')}, Has: ${userPermissions.join(', ')}`,
        );
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    if (requiredAnyPermissions && requiredAnyPermissions.length > 0) {
      const hasAnyPermission = requiredAnyPermissions.some((perm) =>
        userPermissions.includes(perm),
      );
      if (!hasAnyPermission) {
        this.logger.warn(
          `User ${user.userId} denied access: missing any of permissions. Required any of: ${requiredAnyPermissions.join(', ')}, Has: ${userPermissions.join(', ')}`,
        );
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    this.logger.debug(`User ${user.userId} access granted`);
    return true;
  }
}
