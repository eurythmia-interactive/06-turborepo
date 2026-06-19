import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@repo/database';
import {
  createTenantSchema,
  suspendTenantSchema,
  tenantListQuerySchema,
  updateTenantSchema,
} from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { RequireAnyPermission } from '../../auth/decorators/require-any-permission.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { TenantAdminService } from './tenant-admin.service.js';

@Controller('admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class TenantAdminController {
  constructor(private readonly tenantAdminService: TenantAdminService) {}

  @Get()
  @RequireAnyPermission('tenant:read')
  async findAll(@Query(new ZodValidationPipe(tenantListQuerySchema)) query: any, @Req() req: any) {
    return this.tenantAdminService.findAll(query);
  }

  @Get(':id')
  @RequireAnyPermission('tenant:read')
  async findById(@Param('id') id: string) {
    return this.tenantAdminService.findById(id);
  }

  @Post()
  @Permissions('tenant:write')
  async create(
    @Body(new ZodValidationPipe(createTenantSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.tenantAdminService.create(body, userId, ip, userAgent);
  }

  @Patch(':id')
  @Permissions('tenant:write')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTenantSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.tenantAdminService.update(id, body, userId, ip, userAgent);
  }

  @Delete(':id')
  @Permissions('tenant:delete')
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.tenantAdminService.softDelete(id, userId, ip, userAgent);
  }

  @Post(':id/suspend')
  @Permissions('tenant:suspend')
  async suspend(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(suspendTenantSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.tenantAdminService.suspend(id, body, userId, ip, userAgent);
  }

  @Post(':id/restore')
  @Permissions('tenant:suspend')
  async restore(@Param('id') id: string, @CurrentUser('userId') userId: string, @Req() req: any) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.tenantAdminService.restore(id, userId, ip, userAgent);
  }

  @Get(':id/stats')
  @RequireAnyPermission('tenant:read')
  async getStats(@Param('id') id: string) {
    return this.tenantAdminService.getStats(id);
  }

  private extractIp(req: any): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0]?.trim() || 'unknown';
      }
      if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0] || 'unknown';
      }
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}
