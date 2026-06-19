import { Injectable, Inject } from '@nestjs/common';
import type { PrismaClient } from '@repo/database';
import { PRISMA_CLIENT } from '../../database/database.module.js';

@Injectable()
export class IpAllowlistService {
  private allowedIps: Set<string> = new Set();
  private lastRefresh: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async isAllowed(ip: string): Promise<boolean> {
    await this.refreshCache();

    if (this.allowedIps.size === 0) {
      return true;
    }

    return this.allowedIps.has(ip);
  }

  private async refreshCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastRefresh < this.CACHE_TTL) {
      return;
    }

    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'admin_allowed_ips' },
    });

    if (config && Array.isArray(config.value)) {
      this.allowedIps = new Set(config.value as string[]);
    } else {
      this.allowedIps.clear();
    }

    this.lastRefresh = now;
  }
}
