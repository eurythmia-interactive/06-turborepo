import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { enableMaintenanceSchema } from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { MaintenanceService } from './maintenance.service.js';
import { Role } from '@repo/database';
import type { EnableMaintenanceInput } from '@repo/shared';

@Controller('admin/system/maintenance')
@Roles(Role.SUPER_ADMIN)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('enable')
  @Permissions('system:maintenance')
  async enable(
    @Body(new ZodValidationPipe(enableMaintenanceSchema))
    body: EnableMaintenanceInput,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    await this.maintenanceService.enable(
      body.message,
      body.scheduledEnd,
      user.userId,
      req.ip,
      req.get('user-agent'),
    );
    return { success: true };
  }

  @Post('disable')
  @Permissions('system:maintenance')
  async disable(@Req() req: Request) {
    const user = req.user as any;
    await this.maintenanceService.disable(user.userId, req.ip, req.get('user-agent'));
    return { success: true };
  }

  @Get('status')
  @Permissions('system:maintenance')
  async getStatus() {
    return this.maintenanceService.getStatus();
  }
}
