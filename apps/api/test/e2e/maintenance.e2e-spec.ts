import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { AuthModule } from '../../src/auth/auth.module.js';
import { AdminModule } from '../../src/admin/admin.module.js';
import { DatabaseModule, PRISMA_CLIENT } from '../../src/database/database.module.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';
import { getTestPrismaClient, cleanTestDatabase } from '../helpers/test-db.js';
import { createTestUser } from '../helpers/fixtures.js';
import { validate } from '../../src/config/env.validation.js';
import cookieParser from 'cookie-parser';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../src/auth/guards/roles.guard.js';
import { PermissionsGuard } from '../../src/auth/guards/permissions.guard.js';
import type { PrismaClient, Role } from '@repo/database';

describe('Maintenance E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let superAdminToken: string;
  let adminToken: string;

  beforeAll(async () => {
    prisma = await getTestPrismaClient();

    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate,
          envFilePath: '../../.env',
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
        DatabaseModule,
        AuthModule,
        AdminModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
        {
          provide: APP_GUARD,
          useClass: PermissionsGuard,
        },
      ],
    })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(prisma)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get(ConfigService);

    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', {
      exclude: ['/health'],
    });
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter(configService));

    await app.init();
  });

  afterAll(async () => {
    await cleanTestDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    const superAdmin = await createTestUser(prisma, {
      role: 'SUPER_ADMIN' as Role,
      email: 'superadmin@example.com',
    });

    const admin = await createTestUser(prisma, {
      role: 'ADMIN' as Role,
      email: 'admin@example.com',
    });

    const superAdminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@example.com', password: 'password' });

    superAdminToken = superAdminLogin.body.accessToken;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });

    adminToken = adminLogin.body.accessToken;
  });

  describe('GET /admin/system/maintenance/status', () => {
    it('should return disabled status by default', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/system/maintenance/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.enabled).toBe(false);
    });

    it('should reject non-SUPER_ADMIN users', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/system/maintenance/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/system/maintenance/status').expect(401);
    });
  });

  describe('POST /admin/system/maintenance/enable', () => {
    it('should enable maintenance mode', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/system/maintenance/enable')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ message: 'System maintenance', scheduledEnd: '2026-12-31T23:59:59Z' })
        .expect(201);

      const statusResponse = await request(app.getHttpServer())
        .get('/api/v1/admin/system/maintenance/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(statusResponse.body.enabled).toBe(true);
      expect(statusResponse.body.message).toBe('System maintenance');
    });

    it('should reject non-SUPER_ADMIN users', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/system/maintenance/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'Maintenance' })
        .expect(403);
    });
  });

  describe('POST /admin/system/maintenance/disable', () => {
    it('should disable maintenance mode', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/system/maintenance/enable')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ message: 'Maintenance' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/admin/system/maintenance/disable')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(201);

      const statusResponse = await request(app.getHttpServer())
        .get('/api/v1/admin/system/maintenance/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(statusResponse.body.enabled).toBe(false);
    });
  });
});
