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
  addToTenantSchema,
  bulkRoleAssignSchema,
  bulkUserActionSchema,
  createUserSchema,
  suspendUserSchema,
  updateTenantRoleSchema,
  updateUserSchema,
  userListQuerySchema,
} from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { RequireAnyPermission } from '../../auth/decorators/require-any-permission.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { UserAdminService } from './user-admin.service.js';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class UserAdminController {
  constructor(private readonly userAdminService: UserAdminService) {}

  @Get()
  @RequireAnyPermission('user:read')
  async findAll(@Query(new ZodValidationPipe(userListQuerySchema)) query: any) {
    return this.userAdminService.findAll(query);
  }

  @Get(':id')
  @RequireAnyPermission('user:read')
  async findById(@Param('id') id: string) {
    return this.userAdminService.findById(id);
  }

  @Post()
  @Permissions('user:write')
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.create(body, userId, ip, userAgent);
  }

  @Patch(':id')
  @Permissions('user:write')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.update(id, body, userId, ip, userAgent);
  }

  @Delete(':id')
  @Permissions('user:delete')
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.softDelete(id, userId, ip, userAgent);
  }

  @Post(':id/suspend')
  @Permissions('user:suspend')
  async suspend(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(suspendUserSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.suspend(id, body.reason, userId, ip, userAgent);
  }

  @Post(':id/activate')
  @Permissions('user:suspend')
  async activate(@Param('id') id: string, @CurrentUser('userId') userId: string, @Req() req: any) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.activate(id, userId, ip, userAgent);
  }

  @Post(':id/reset-password')
  @Permissions('user:reset-password')
  async forcePasswordReset(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.forcePasswordReset(id, userId, ip, userAgent);
  }

  @Post(':id/tenants')
  @Permissions('user:write')
  async addToTenant(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addToTenantSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.addToTenant(id, body.tenantId, body.role, userId, ip, userAgent);
  }

  @Delete(':id/tenants/:tenantId')
  @Permissions('user:write')
  async removeFromTenant(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.removeFromTenant(id, tenantId, userId, ip, userAgent);
  }

  @Patch(':id/tenants/:tenantId')
  @Permissions('user:write')
  async updateTenantRole(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(updateTenantRoleSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.updateTenantRole(id, tenantId, body.role, userId, ip, userAgent);
  }

  @Post('bulk/suspend')
  @Permissions('user:suspend')
  async bulkSuspend(
    @Body(new ZodValidationPipe(bulkUserActionSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.bulkSuspend(
      body.userIds,
      body.reason || '',
      userId,
      ip,
      userAgent,
    );
  }

  @Post('bulk/activate')
  @Permissions('user:suspend')
  async bulkActivate(
    @Body(new ZodValidationPipe(bulkUserActionSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.bulkActivate(body.userIds, userId, ip, userAgent);
  }

  @Post('bulk/delete')
  @Permissions('user:delete')
  async bulkDelete(
    @Body(new ZodValidationPipe(bulkUserActionSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.bulkDelete(body.userIds, userId, ip, userAgent);
  }

  @Post('bulk/role')
  @Permissions('user:write')
  async bulkRoleAssign(
    @Body(new ZodValidationPipe(bulkRoleAssignSchema)) body: any,
    @CurrentUser('userId') userId: string,
    @Req() req: any,
  ) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    return this.userAdminService.bulkRoleAssign(
      body.userIds,
      body.tenantId,
      body.role,
      userId,
      ip,
      userAgent,
    );
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
