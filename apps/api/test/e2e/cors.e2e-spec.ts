import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate } from '../../src/config/env.validation.js';
import { setupTestDatabase, teardownTestDatabase, cleanTestDatabase } from '../helpers/test-db.js';

@Controller('cors-test')
class CorsTestController {
  @Get()
  test() {
    return { message: 'ok' };
  }
}

describe('CORS E2E', () => {
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
              CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3001'],
            }),
          ],
        }),
      ],
      controllers: [CorsTestController],
    }).compile();

    app = moduleRef.createNestApplication();

    const configService = app.get(ConfigService);
    const corsOrigins = configService.get<string[]>('CORS_ORIGINS', []);

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });

    await app.init();
  });

  afterAll(async () => {
    await cleanTestDatabase();
    await app.close();
    await teardownTestDatabase();
  });

  describe('GET /cors-test', () => {
    it('should allow requests from allowed origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/cors-test')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow requests from second allowed origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/cors-test')
        .set('Origin', 'http://localhost:3001');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    });

    it('should not include CORS headers for disallowed origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/cors-test')
        .set('Origin', 'http://evil.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should include credentials header', async () => {
      const response = await request(app.getHttpServer())
        .get('/cors-test')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight OPTIONS request', async () => {
      const response = await request(app.getHttpServer())
        .options('/cors-test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should include allowed methods in preflight', async () => {
      const response = await request(app.getHttpServer())
        .options('/cors-test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should handle requests without Origin header', async () => {
      const response = await request(app.getHttpServer()).get('/cors-test');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
