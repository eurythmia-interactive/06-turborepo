import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthController } from '../../src/health/health.controller.js';
import { HealthModule } from '../../src/health/health.module.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { PRISMA_CLIENT } from '../../src/database/database.module.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { getTestPrismaClient } from '../helpers/test-db.js';
import { validate } from '../../src/config/env.validation.js';
import { cleanTestDatabase } from '../helpers/test-db.js';

describe('Health E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const testPrisma = await getTestPrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate,
          envFilePath: '../../.env',
          load: [
            () => ({
              NODE_ENV: 'test',
              PORT: 0,
              JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
              JWT_EXPIRES_IN: '1h',
              CORS_ORIGINS: ['http://localhost:3000'],
            }),
          ],
        }),
        DatabaseModule,
        HealthModule,
      ],
    })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(testPrisma)
      .compile();

    app = moduleRef.createNestApplication();

    const configService = app.get(ConfigService);
    app.useGlobalFilters(new GlobalExceptionFilter(configService));

    await app.init();
  });

  afterAll(async () => {
    await cleanTestDatabase();
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(200);
    });

    it('should return correct structure', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.body).toHaveProperty('api');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return api status ok', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.body.api).toBe('ok');
    });

    it('should return database status ok when DB is healthy', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.body.database).toBe('ok');
    });

    it('should include timestamp as ISO string', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    it('should return JSON content type', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
