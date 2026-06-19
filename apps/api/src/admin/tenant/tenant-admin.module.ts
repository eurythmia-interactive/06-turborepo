import { Module } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { TenantAdminController } from './tenant-admin.controller.js';
import { TenantAdminService } from './tenant-admin.service.js';

@Module({
  imports: [AdminModule],
  controllers: [TenantAdminController],
  providers: [TenantAdminService],
  exports: [TenantAdminService],
})
export class TenantAdminModule {}
