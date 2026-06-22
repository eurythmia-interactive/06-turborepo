import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { MaintenanceController } from './maintenance.controller.js';
import { MaintenanceService } from './maintenance.service.js';
import { MaintenanceMiddleware } from './maintenance.middleware.js';
import { AuditService } from '../services/audit.service.js';

@Module({
  imports: [forwardRef(() => AdminModule)],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceMiddleware, AuditService],
  exports: [MaintenanceService, MaintenanceMiddleware],
})
export class SystemAdminModule {}
