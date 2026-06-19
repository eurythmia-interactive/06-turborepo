import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RolePermissions } from '@repo/shared';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { REQUIRE_ANY_PERMISSION_KEY } from '../decorators/require-any-permission.decorator.js';
import type { AuthenticatedUser } from '../interfaces/token-payload.interface.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    const userPermissions = RolePermissions[user.role] ?? [];

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((perm) =>
        userPermissions.includes(perm as never),
      );
      if (!hasAllPermissions) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    if (requiredAnyPermissions && requiredAnyPermissions.length > 0) {
      const hasAnyPermission = requiredAnyPermissions.some((perm) =>
        userPermissions.includes(perm as never),
      );
      if (!hasAnyPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
