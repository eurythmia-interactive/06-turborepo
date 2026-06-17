import {
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module.js';
import type { PrismaClient } from '@repo/database';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '@repo/database';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('tenants')
export class TenantController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  async createTenant(
    @CurrentUser('userId') userId: string,
    @Body() body: { name: string; slug: string },
  ) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: body.slug },
    });

    if (existing) {
      throw new ConflictException('Tenant slug already exists');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: body.name,
        slug: body.slug,
        users: {
          create: {
            userId,
          },
        },
      },
    });

    return tenant;
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async listTenants() {
    return this.prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async getTenant(@Param('id') id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }
}
