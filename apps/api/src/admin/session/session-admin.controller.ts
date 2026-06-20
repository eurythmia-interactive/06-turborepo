import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@repo/database';
import { sessionListQuerySchema } from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionAdminService } from './session-admin.service.js';

@Controller('admin/sessions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SessionAdminController {
  constructor(private readonly sessionService: SessionAdminService) {}

  @Get()
  @Permissions('admin:audit')
  async findAll(@Query(new ZodValidationPipe(sessionListQuerySchema)) query: any) {
    return this.sessionService.findAll(query);
  }

  @Get('summary')
  @Permissions('admin:audit')
  async getSummary() {
    return this.sessionService.getSummary();
  }

  @Get('user/:userId')
  @Permissions('admin:audit')
  async findByUserId(
    @Param('userId') userId: string,
    @Query(new ZodValidationPipe(sessionListQuerySchema)) query: any,
  ) {
    return this.sessionService.findByUserId(userId, query);
  }

  @Delete(':id')
  @Permissions('admin:audit')
  async revoke(@Param('id') id: string, @CurrentUser('userId') adminUserId: string) {
    return this.sessionService.revoke(id, adminUserId);
  }

  @Delete('user/:userId')
  @Permissions('admin:audit')
  async revokeAllForUser(
    @Param('userId') userId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.sessionService.revokeAllForUser(userId, adminUserId);
  }
}
