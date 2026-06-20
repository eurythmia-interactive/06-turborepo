import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { TenantAdminController } from './tenant-admin.controller.js';
import { TenantAdminService } from './tenant-admin.service.js';

@Module({
  imports: [forwardRef(() => AdminModule), forwardRef(() => AuthModule)],
  controllers: [TenantAdminController],
  providers: [TenantAdminService],
  exports: [TenantAdminService],
})
export class TenantAdminModule {}
