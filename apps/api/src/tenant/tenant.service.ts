import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module.js';
import type { PrismaClient } from '@repo/database';

@Injectable()
export class TenantService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
    });
  }

  async getUserTenants(userId: string) {
    return this.prisma.userTenant.findMany({
      where: { userId },
      include: { tenant: true },
    });
  }
}
