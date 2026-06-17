import { Controller, Get, Inject } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Public()
  @Get()
  async check() {
    let databaseStatus: 'ok' | 'error' = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'error';
    }

    return {
      api: 'ok' as const,
      database: databaseStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
