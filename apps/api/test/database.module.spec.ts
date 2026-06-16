import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule, PRISMA_CLIENT } from '../src/database/database.module.js';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanTestDatabase,
  getTestPrismaClient,
} from './helpers/test-db.js';
import type { PrismaClient } from '@repo/database';

describe('DatabaseModule (integration)', () => {
  let module: TestingModule;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prisma = module.get<PrismaClient>(PRISMA_CLIENT);
  });

  it('should provide Prisma client', () => {
    expect(prisma).toBeDefined();
    expect(prisma).toBeInstanceOf(Object);
  });

  it('should export Prisma client for other modules', () => {
    const exportedPrisma = module.get<PrismaClient>(PRISMA_CLIENT);
    expect(exportedPrisma).toBe(prisma);
  });

  it('should provide singleton instance', async () => {
    const module2 = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    const prisma1 = module.get<PrismaClient>(PRISMA_CLIENT);
    const prisma2 = module2.get<PrismaClient>(PRISMA_CLIENT);

    expect(prisma1).toBe(prisma2);

    await module2.close();
  });

  it('should connect to test database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  it('should be able to create and query users', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');

    const foundUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('test@example.com');
  });

  it('should clean database between tests', async () => {
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(0);
  });
});
