import { Module } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { UserAdminController } from './user-admin.controller.js';
import { UserAdminService } from './user-admin.service.js';

@Module({
  imports: [AdminModule],
  controllers: [UserAdminController],
  providers: [UserAdminService],
  exports: [UserAdminService],
})
export class UserAdminModule {}
