import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { ImpersonationService } from './impersonation.service.js';
import { Role } from '@repo/database';

@Controller('admin/impersonation')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  @Post('start')
  @Permissions('user:impersonate')
  async start(@Body() body: { userId: string; reason: string }, @Req() req: Request) {
    const user = req.user as any;
    return this.impersonationService.startImpersonation(
      user.userId,
      body.userId,
      body.reason,
      req.ip,
      req.get('user-agent'),
    );
  }

  @Post('stop')
  @Permissions('user:impersonate')
  async stop(@Req() req: Request) {
    const user = req.user as any;
    return this.impersonationService.stopImpersonation(user.userId, req.ip, req.get('user-agent'));
  }

  @Get('status')
  @Permissions('user:impersonate')
  async getStatus(@Req() req: Request) {
    const user = req.user as any;
    return this.impersonationService.getStatus(user.userId);
  }
}
