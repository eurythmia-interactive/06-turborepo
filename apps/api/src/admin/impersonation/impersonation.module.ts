import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { ImpersonationController } from './impersonation.controller.js';
import { ImpersonationService } from './impersonation.service.js';
import { AuditService } from '../services/audit.service.js';

@Module({
  imports: [forwardRef(() => AdminModule), forwardRef(() => AuthModule)],
  controllers: [ImpersonationController],
  providers: [ImpersonationService, AuditService],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
