import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../src/health/health.controller.js';
import { PRISMA_CLIENT } from '../src/database/database.module.js';
import { setupTestDatabase, teardownTestDatabase, getTestPrismaClient } from './helpers/test-db.js';
import type { PrismaClient } from '@repo/database';

describe('HealthController (integration)', () => {
  let controller: HealthController;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    prisma = await getTestPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PRISMA_CLIENT,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status with api ok', async () => {
    const result = await controller.check();

    expect(result.api).toBe('ok');
  });

  it('should return health status with database ok when DB is healthy', async () => {
    const result = await controller.check();

    expect(result.database).toBe('ok');
  });

  it('should include timestamp in response', async () => {
    const result = await controller.check();

    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('should return database error when DB query fails', async () => {
    const mockPrisma = {
      $queryRaw: async () => {
        throw new Error('Database connection failed');
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PRISMA_CLIENT,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    const controllerWithError = module.get<HealthController>(HealthController);
    const result = await controllerWithError.check();

    expect(result.api).toBe('ok');
    expect(result.database).toBe('error');
    expect(result.timestamp).toBeDefined();
  });

  it('should perform real database query', async () => {
    const result = await controller.check();

    expect(result.database).toBe('ok');
  });

  it('should return correct response structure', async () => {
    const result = await controller.check();

    expect(result).toHaveProperty('api');
    expect(result).toHaveProperty('database');
    expect(result).toHaveProperty('timestamp');
    expect(Object.keys(result)).toHaveLength(3);
  });
});
