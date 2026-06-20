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
import { createTestUser, createTestTenant } from '../helpers/fixtures.js';
import { validate } from '../../src/config/env.validation.js';
import cookieParser from 'cookie-parser';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../src/auth/guards/roles.guard.js';
import { PermissionsGuard } from '../../src/auth/guards/permissions.guard.js';
import type { PrismaClient, Role } from '@repo/database';

describe('Impersonation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let memberUserId: string;

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

    const admin = await createTestUser(prisma, {
      role: 'ADMIN' as Role,
      email: 'admin@example.com',
    });

    const tenant = await createTestTenant(prisma, admin.id, { name: 'Test Tenant' });

    const member = await createTestUser(prisma, {
      role: 'MEMBER' as Role,
      email: 'member@example.com',
    });

    memberUserId = member.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });

    adminToken = adminLogin.body.accessToken;
  });

  describe('POST /admin/impersonation/start', () => {
    it('should start impersonation and return token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/impersonation/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId, reason: 'Support request' })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should reject impersonating self', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });

      await request(app.getHttpServer())
        .post('/api/v1/admin/impersonation/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: admin!.id, reason: 'Test' })
        .expect(400);
    });

    it('should reject impersonating SUPER_ADMIN', async () => {
      const superAdmin = await createTestUser(prisma, {
        role: 'SUPER_ADMIN' as Role,
        email: 'superadmin@example.com',
      });

      await request(app.getHttpServer())
        .post('/api/v1/admin/impersonation/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: superAdmin.id, reason: 'Test' })
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/impersonation/start')
        .send({ userId: memberUserId, reason: 'Test' })
        .expect(401);
    });
  });

  describe('GET /admin/impersonation/status', () => {
    it('should return not impersonating when no active session', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/impersonation/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isImpersonating).toBe(false);
    });

    it('should return impersonating status after start', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/impersonation/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId, reason: 'Support' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/impersonation/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isImpersonating).toBe(true);
      expect(response.body.targetUserId).toBe(memberUserId);
    });
  });

  describe('POST /admin/impersonation/stop', () => {
    it('should stop impersonation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/impersonation/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId, reason: 'Support' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/admin/impersonation/stop')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/impersonation/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isImpersonating).toBe(false);
    });
  });
});
