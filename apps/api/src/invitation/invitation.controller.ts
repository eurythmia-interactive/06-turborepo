import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { InvitationService } from '../admin/invitation/invitation.service.js';

@Controller('invitations')
export class PublicInvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get(':token')
  @Public()
  async getInvitation(@Param('token') token: string) {
    const invitation = await this.invitationService.getInvitationByToken(token);
    return {
      email: invitation.email,
      tenantName: invitation.tenant?.name || null,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    };
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  async accept(@Param('token') token: string, @Req() req: Request) {
    const user = req.user as any;
    return this.invitationService.acceptInvitation(token, user.userId);
  }
}
