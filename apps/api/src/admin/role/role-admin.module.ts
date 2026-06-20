import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { RoleAdminController } from './role-admin.controller.js';
import { RoleAdminService } from './role-admin.service.js';

@Module({
  imports: [forwardRef(() => AdminModule), forwardRef(() => AuthModule)],
  controllers: [RoleAdminController],
  providers: [RoleAdminService],
  exports: [RoleAdminService],
})
export class RoleAdminModule {}
