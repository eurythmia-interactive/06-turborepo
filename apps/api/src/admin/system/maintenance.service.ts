import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { AuditService } from '../services/audit.service.js';

export interface MaintenanceStatus {
  enabled: boolean;
  message?: string;
  scheduledEnd?: string;
}

@Injectable()
export class MaintenanceService {
  private cachedStatus: MaintenanceStatus | null = null;

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly auditService: AuditService,
  ) {}

  async enable(
    message: string | undefined,
    scheduledEnd: string | undefined,
    userId: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<void> {
    const value = {
      enabled: true,
      message: message || 'System is under maintenance',
      scheduledEnd: scheduledEnd ?? null,
    };

    await this.prisma.systemConfig.upsert({
      where: { key: 'maintenance_mode' },
      update: { value, updatedBy: userId },
      create: {
        key: 'maintenance_mode',
        value,
        description: 'Maintenance mode configuration',
        updatedBy: userId,
      },
    });

    this.cachedStatus = null;

    await this.auditService.log({
      userId,
      action: 'system.maintenance_on',
      details: { message, scheduledEnd },
      ip,
      userAgent,
    });
  }

  async disable(
    userId: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: { enabled: false }, updatedBy: userId },
      create: {
        key: 'maintenance_mode',
        value: { enabled: false },
        description: 'Maintenance mode configuration',
        updatedBy: userId,
      },
    });

    this.cachedStatus = null;

    await this.auditService.log({
      userId,
      action: 'system.maintenance_off',
      ip,
      userAgent,
    });
  }

  async getStatus(): Promise<MaintenanceStatus> {
    if (this.cachedStatus) return this.cachedStatus;

    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'maintenance_mode' },
    });

    const value = config?.value as any;
    this.cachedStatus = {
      enabled: value?.enabled ?? false,
      message: value?.message,
      scheduledEnd: value?.scheduledEnd,
    };

    return this.cachedStatus;
  }

  async isActive(): Promise<boolean> {
    const status = await this.getStatus();
    return status.enabled;
  }
}
