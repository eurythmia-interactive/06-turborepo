import { Injectable, Inject } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module.js';
import type { PrismaClient } from '@repo/database';

@Injectable()
export class UserService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}
}
