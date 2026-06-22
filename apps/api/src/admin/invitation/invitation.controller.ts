import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  createInvitationSchema,
  invitationListQuerySchema,
  type CreateInvitationInput,
  type InvitationListQuery,
} from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { InvitationService } from './invitation.service.js';
import { Role } from '@repo/database';

@Controller('admin/invitations')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @Permissions('user:write')
  async create(
    @Body(new ZodValidationPipe(createInvitationSchema)) body: CreateInvitationInput,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.invitationService.createInvitation(
      body.email,
      body.tenantId,
      body.role as Role,
      user.userId,
      req.ip,
      req.get('user-agent'),
    );
  }

  @Get()
  @Permissions('user:read')
  async list(@Query(new ZodValidationPipe(invitationListQuerySchema)) query: InvitationListQuery) {
    return this.invitationService.getInvitations(query.tenantId, query.status);
  }

  @Post(':id/resend')
  @Permissions('user:write')
  async resend(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.invitationService.resendInvitation(id, user.userId, req.ip, req.get('user-agent'));
  }

  @Delete(':id')
  @Permissions('user:write')
  async cancel(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.invitationService.cancelInvitation(id, user.userId, req.ip, req.get('user-agent'));
  }
}
