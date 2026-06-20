import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module.js';
import { PublicInvitationController } from './invitation.controller.js';
import { InvitationService } from '../admin/invitation/invitation.service.js';
import { AuditService } from '../admin/services/audit.service.js';

@Module({
  imports: [forwardRef(() => AdminModule)],
  controllers: [PublicInvitationController],
  providers: [InvitationService, AuditService],
})
export class PublicInvitationModule {}
