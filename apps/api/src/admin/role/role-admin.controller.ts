import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@repo/database';
import {
  assignPermissionsSchema,
  createRoleSchema,
  roleListQuerySchema,
  updateRoleSchema,
} from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { RequireAnyPermission } from '../../auth/decorators/require-any-permission.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { RoleAdminService } from './role-admin.service.js';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class RoleAdminController {
  constructor(private readonly roleAdminService: RoleAdminService) {}

  @Get()
  @RequireAnyPermission('role:read')
  async findAll(@Query(new ZodValidationPipe(roleListQuerySchema)) query: any) {
    return this.roleAdminService.findAll(query);
  }

  @Get(':id')
  @RequireAnyPermission('role:read')
  async findById(@Param('id') id: string) {
    return this.roleAdminService.findById(id);
  }

  @Get('name/:name')
  @RequireAnyPermission('role:read')
  async findByName(@Param('name') name: string) {
    return this.roleAdminService.findByName(name);
  }

  @Post()
  @Permissions('role:write')
  async create(
    @Body(new ZodValidationPipe(createRoleSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.roleAdminService.create(body, userId, ip, userAgent);
  }

  @Patch(':id')
  @Permissions('role:write')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.roleAdminService.update(id, body, userId, ip, userAgent);
  }

  @Delete(':id')
  @Permissions('role:delete')
  async delete(
    @Param('id') id: string,
    @Body() body: { reassignTo?: string },
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.roleAdminService.delete(id, body || {}, userId, ip, userAgent);
  }

  @Put(':id/permissions')
  @Permissions('role:write')
  async assignPermissions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignPermissionsSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.roleAdminService.assignPermissions(id, body.permissions, userId, ip, userAgent);
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
