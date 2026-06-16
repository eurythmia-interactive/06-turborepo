import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { validate } from '../../src/config/env.validation.js';
import { setupTestDatabase, teardownTestDatabase, cleanTestDatabase } from '../helpers/test-db.js';

@Controller('errors')
class ErrorTestController {
  @Get('not-found')
  throwNotFound() {
    throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
  }

  @Get('bad-request')
  throwBadRequest() {
    throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
  }

  @Get('unauthorized')
  throwUnauthorized() {
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  @Get('conflict')
  throwConflict() {
    throw new HttpException('Resource already exists', HttpStatus.CONFLICT);
  }

  @Get('internal')
  throwInternal() {
    throw new Error('Internal server error');
  }

  @Get('unknown')
  throwUnknown() {
    throw 'string error';
  }
}

describe('Error Handling E2E', () => {
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
      controllers: [ErrorTestController],
    }).compile();

    app = moduleRef.createNestApplication();

    const configService = app.get(ConfigService);

    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter(configService));

    await app.init();
  });

  afterAll(async () => {
    await cleanTestDatabase();
    await app.close();
    await teardownTestDatabase();
  });

  describe('HTTP Exceptions', () => {
    it('should return 404 for not found', async () => {
      const response = await request(app.getHttpServer()).get('/errors/not-found');

      expect(response.status).toBe(404);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toBe('Resource not found');
    });

    it('should return 400 for bad request', async () => {
      const response = await request(app.getHttpServer()).get('/errors/bad-request');

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe('Bad request');
    });

    it('should return 401 for unauthorized', async () => {
      const response = await request(app.getHttpServer()).get('/errors/unauthorized');

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 409 for conflict', async () => {
      const response = await request(app.getHttpServer()).get('/errors/conflict');

      expect(response.status).toBe(409);
      expect(response.body.statusCode).toBe(409);
      expect(response.body.message).toBe('Resource already exists');
    });
  });

  describe('Unknown Exceptions', () => {
    it('should return 500 for unhandled errors', async () => {
      const response = await request(app.getHttpServer()).get('/errors/internal');

      expect(response.status).toBe(500);
      expect(response.body.statusCode).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should return 500 for non-Error exceptions', async () => {
      const response = await request(app.getHttpServer()).get('/errors/unknown');

      expect(response.status).toBe(500);
      expect(response.body.statusCode).toBe(500);
    });
  });

  describe('Error Response Structure', () => {
    it('should include timestamp in error response', async () => {
      const response = await request(app.getHttpServer()).get('/errors/not-found');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    it('should include path in error response', async () => {
      const response = await request(app.getHttpServer()).get('/errors/not-found');

      expect(response.body.path).toBe('/errors/not-found');
    });

    it('should include statusCode in response body', async () => {
      const response = await request(app.getHttpServer()).get('/errors/bad-request');

      expect(response.body.statusCode).toBe(400);
    });

    it('should include message in response body', async () => {
      const response = await request(app.getHttpServer()).get('/errors/not-found');

      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
    });

    it('should return JSON content type', async () => {
      const response = await request(app.getHttpServer()).get('/errors/not-found');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Production Mode', () => {
    it('should hide stack traces in production', async () => {
      const prodApp = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            validate,
            envFilePath: '../../.env',
            load: [
              () => ({
                NODE_ENV: 'production',
                PORT: 0,
                JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
                JWT_EXPIRES_IN: '1h',
                CORS_ORIGINS: ['http://localhost:3000'],
              }),
            ],
          }),
        ],
        controllers: [ErrorTestController],
      }).compile();

      const app2 = prodApp.createNestApplication();
      const configService = app2.get(ConfigService);

      app2.useGlobalFilters(new GlobalExceptionFilter(configService));
      await app2.init();

      const response = await request(app2.getHttpServer()).get('/errors/internal');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
      expect(response.body).not.toHaveProperty('stack');

      await app2.close();
    });
  });
});
