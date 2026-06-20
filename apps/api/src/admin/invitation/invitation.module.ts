import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { InvitationController } from './invitation.controller.js';
import { InvitationService } from './invitation.service.js';
import { AuditService } from '../services/audit.service.js';

@Module({
  imports: [forwardRef(() => AdminModule)],
  controllers: [InvitationController],
  providers: [InvitationService, AuditService],
  exports: [InvitationService],
})
export class InvitationModule {}
