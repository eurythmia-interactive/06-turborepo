import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import type { PrismaClient } from '@repo/database';

interface AuditLogInput {
  userId: string;
  tenantId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId ?? null,
        action: input.action,
        details: input.details ? (input.details as any) : undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}
