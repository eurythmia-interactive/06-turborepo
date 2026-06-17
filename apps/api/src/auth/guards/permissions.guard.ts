import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@repo/database';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../interfaces/token-payload.interface.js';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: [
    'user:read',
    'user:write',
    'user:delete',
    'tenant:read',
    'tenant:write',
    'tenant:delete',
    'billing:read',
    'billing:write',
  ],
  ADMIN: ['user:read', 'user:write', 'user:delete', 'tenant:read', 'billing:read', 'billing:write'],
  MEMBER: ['user:read', 'user:write', 'tenant:read'],
  GUEST: ['user:read', 'tenant:read'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] ?? [];
    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
