import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { TenantAdminModule } from './tenant/tenant-admin.module.js';
import { UserAdminModule } from './user/user-admin.module.js';
import { RoleAdminModule } from './role/role-admin.module.js';
import { AuditAdminModule } from './audit/audit-admin.module.js';
import { SystemAdminModule } from './system/system-admin.module.js';
import { AdminThrottlerGuard } from './admin.throttler.js';
import { IpAllowlistService } from './services/ip-allowlist.service.js';
import { IpAllowlistGuard } from './guards/ip-allowlist.guard.js';
import { IpAllowlistController } from './controllers/ip-allowlist.controller.js';

@Module({
  imports: [
    TenantAdminModule,
    UserAdminModule,
    RoleAdminModule,
    AuditAdminModule,
    SystemAdminModule,
  ],
  controllers: [AdminController, IpAllowlistController],
  providers: [
    AdminService,
    IpAllowlistService,
    {
      provide: APP_GUARD,
      useClass: IpAllowlistGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminThrottlerGuard,
    },
  ],
  exports: [AdminService, IpAllowlistService],
})
export class AdminModule {}
