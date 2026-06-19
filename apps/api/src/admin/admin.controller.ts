import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@repo/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { TenantGuard } from '../auth/guards/tenant.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  getAdminInfo() {
    return { message: 'Admin dashboard access granted' };
  }
}
