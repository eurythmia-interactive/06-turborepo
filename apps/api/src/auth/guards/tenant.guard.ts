import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../interfaces/token-payload.interface.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const membership = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: user.userId,
          tenantId: user.tenantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('User does not belong to this tenant');
    }

    return true;
  }
}
