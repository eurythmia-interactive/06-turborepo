import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { SessionAdminController } from './session-admin.controller.js';
import { SessionAdminService } from './session-admin.service.js';
import { AuditService } from '../services/audit.service.js';

@Module({
  imports: [forwardRef(() => AdminModule), forwardRef(() => AuthModule)],
  controllers: [SessionAdminController],
  providers: [SessionAdminService, AuditService],
  exports: [SessionAdminService],
})
export class SessionAdminModule {}
