import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, Controller, Post, Body, UsePipes } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { z } from 'zod';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { validate } from '../../src/config/env.validation.js';
import { setupTestDatabase, teardownTestDatabase, cleanTestDatabase } from '../helpers/test-db.js';

const testSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

@Controller('test')
class TestController {
  @Post('valid')
  @UsePipes(new ZodValidationPipe(testSchema))
  createValid(@Body() body: z.infer<typeof testSchema>) {
    return { success: true, data: body };
  }
}

describe('Validation E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTestDatabase();

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
      ],
      controllers: [TestController],
    }).compile();

    app = moduleRef.createNestApplication();

    const configService = app.get(ConfigService);

    app.useGlobalFilters(new GlobalExceptionFilter(configService));

    await app.init();
  });

  afterAll(async () => {
    await cleanTestDatabase();
    await app.close();
    await teardownTestDatabase();
  });

  describe('POST /test/valid', () => {
    it('should return 201 with valid data', async () => {
      const response = await request(app.getHttpServer()).post('/test/valid').send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer()).post('/test/valid').send({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toHaveProperty('email');
      expect(response.body.errors.email).toContain('Invalid email address');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app.getHttpServer()).post('/test/valid').send({
        email: 'test@example.com',
        password: 'short',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty('password');
      expect(response.body.errors.password).toContain('Password must be at least 8 characters');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer()).post('/test/valid').send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty('email');
      expect(response.body.errors).toHaveProperty('password');
    });

    it('should group multiple errors per field', async () => {
      const response = await request(app.getHttpServer()).post('/test/valid').send({
        email: 'invalid',
        password: 'x',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors.email).toBeDefined();
      expect(response.body.errors.password).toBeDefined();
    });

    it('should include timestamp in error response', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/valid')
        .send({ email: 'invalid' });

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    it('should include path in error response', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/valid')
        .send({ email: 'invalid' });

      expect(response.body.path).toBe('/test/valid');
    });

    it('should handle optional fields correctly', async () => {
      const response = await request(app.getHttpServer()).post('/test/valid').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBeUndefined();
    });
  });
});
