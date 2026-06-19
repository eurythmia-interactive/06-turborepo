import { Controller, Get, Post, Delete, Body, Param, UseGuards, Inject } from '@nestjs/common';
import type { PrismaClient } from '@repo/database';
import { PRISMA_CLIENT } from '../../database/database.module.js';
import { z } from 'zod';

const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

const ipSchema = z
  .string()
  .refine((val) => ipv4Regex.test(val) || ipv6Regex.test(val), { message: 'Invalid IP address' });

@Controller('admin/ip-allowlist')
@UseGuards()
export class IpAllowlistController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  async getAllowlist() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'admin_allowed_ips' },
    });

    return {
      ips: config?.value ?? [],
    };
  }

  @Post()
  async addIp(@Body() body: { ip: string }) {
    const parsed = ipSchema.safeParse(body.ip);
    if (!parsed.success) {
      return { error: 'Invalid IP address' };
    }

    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'admin_allowed_ips' },
    });

    const currentIps = (config?.value as string[]) ?? [];

    if (currentIps.includes(parsed.data)) {
      return { error: 'IP already in allowlist' };
    }

    const newIps = [...currentIps, parsed.data];

    await this.prisma.systemConfig.upsert({
      where: { key: 'admin_allowed_ips' },
      create: {
        key: 'admin_allowed_ips',
        value: newIps,
        description: 'List of allowed IP addresses for admin access',
      },
      update: {
        value: newIps,
      },
    });

    return { success: true, ips: newIps };
  }

  @Delete(':ip')
  async removeIp(@Param('ip') ip: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'admin_allowed_ips' },
    });

    const currentIps = (config?.value as string[]) ?? [];
    const newIps = currentIps.filter((existingIp) => existingIp !== ip);

    await this.prisma.systemConfig.upsert({
      where: { key: 'admin_allowed_ips' },
      create: {
        key: 'admin_allowed_ips',
        value: newIps,
        description: 'List of allowed IP addresses for admin access',
      },
      update: {
        value: newIps,
      },
    });

    return { success: true, ips: newIps };
  }
}
