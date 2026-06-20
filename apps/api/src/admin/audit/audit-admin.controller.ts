import { Controller, Get, Param, Query, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { Role } from '@repo/database';
import { auditLogQuerySchema, auditSummaryQuerySchema, auditExportQuerySchema } from '@repo/shared';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../auth/guards/permissions.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuditService } from '../services/audit.service.js';
import type { Response } from 'express';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AuditAdminController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Permissions('admin:audit')
  async findAll(@Query(new ZodValidationPipe(auditLogQuerySchema)) query: any) {
    return this.auditService.findAll(query);
  }

  @Get('logs/:id')
  @Permissions('admin:audit')
  async findById(@Param('id') id: string) {
    const log = await this.auditService.findById(id);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }

  @Get('summary')
  @Permissions('admin:audit')
  async getSummary(@Query(new ZodValidationPipe(auditSummaryQuerySchema)) query: any) {
    return this.auditService.getActionSummary(query.timeRange);
  }

  @Get('export')
  @Permissions('admin:audit')
  async exportLogs(
    @Query(new ZodValidationPipe(auditExportQuerySchema)) query: any,
    @Res() res: Response,
  ) {
    const result = await this.auditService.exportLogs(query);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }
}
