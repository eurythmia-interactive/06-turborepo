import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { AuthModule } from '../../src/auth/auth.module.js';
import { AdminModule } from '../../src/admin/admin.module.js';
import { EmailModule } from '../../src/common/email/email.module.js';
import { DatabaseModule, PRISMA_CLIENT } from '../../src/database/database.module.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';
import { getTestPrismaClient, cleanTestDatabase } from '../helpers/test-db.js';
import { createTestUser, createTestTenant, createTestInvitation } from '../helpers/fixtures.js';
import { validate } from '../../src/config/env.validation.js';
import cookieParser from 'cookie-parser';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../src/auth/guards/roles.guard.js';
import { PermissionsGuard } from '../../src/auth/guards/permissions.guard.js';
import type { PrismaClient, Role } from '@repo/database';

describe('Invitation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let tenantId: string;

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
        EmailModule,
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
    tenantId = tenant.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });

    adminToken = adminLogin.body.accessToken;
  });

  describe('POST /admin/invitations', () => {
    it('should create invitation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@example.com',
          tenantId,
          role: 'MEMBER',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body.role).toBe('MEMBER');
    });

    it('should reject duplicate invitations', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@example.com',
          tenantId,
          role: 'MEMBER',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/admin/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@example.com',
          tenantId,
          role: 'MEMBER',
        })
        .expect(409);
    });

    it('should reject invitation for existing user', async () => {
      await createTestUser(prisma, { email: 'existing@example.com' });

      await request(app.getHttpServer())
        .post('/api/v1/admin/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'existing@example.com',
          tenantId,
          role: 'MEMBER',
        })
        .expect(409);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/invitations')
        .send({
          email: 'newuser@example.com',
          tenantId,
          role: 'MEMBER',
        })
        .expect(401);
    });
  });

  describe('GET /admin/invitations', () => {
    it('should list invitations', async () => {
      await createTestInvitation(
        prisma,
        (await prisma.user.findUnique({ where: { email: 'admin@example.com' } }))!.id,
        {
          email: 'user1@example.com',
          tenantId,
        },
      );

      await createTestInvitation(
        prisma,
        (await prisma.user.findUnique({ where: { email: 'admin@example.com' } }))!.id,
        {
          email: 'user2@example.com',
          tenantId,
        },
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });

      await createTestInvitation(prisma, admin!.id, {
        email: 'pending@example.com',
        tenantId,
      });

      await createTestInvitation(prisma, admin!.id, {
        email: 'accepted@example.com',
        tenantId,
        acceptedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/invitations?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe('pending@example.com');
    });
  });

  describe('POST /admin/invitations/:id/resend', () => {
    it('should resend invitation', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      const invitation = await createTestInvitation(prisma, admin!.id, {
        email: 'resend@example.com',
        tenantId,
      });

      await request(app.getHttpServer())
        .post(`/api/v1/admin/invitations/${invitation.id}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
    });
  });

  describe('DELETE /admin/invitations/:id', () => {
    it('should cancel invitation', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      const invitation = await createTestInvitation(prisma, admin!.id, {
        email: 'cancel@example.com',
        tenantId,
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/invitations/${invitation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const canceled = await prisma.userInvitation.findUnique({
        where: { id: invitation.id },
      });

      expect(canceled!.expiresAt.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('GET /invitations/:token (public)', () => {
    it('should return invitation details', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      const invitation = await createTestInvitation(prisma, admin!.id, {
        email: 'public@example.com',
        tenantId,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/invitations/${invitation.token}`)
        .expect(200);

      expect(response.body.email).toBe('public@example.com');
      expect(response.body.role).toBe('MEMBER');
    });

    it('should return 404 for invalid token', async () => {
      await request(app.getHttpServer()).get('/api/v1/invitations/invalid-token').expect(404);
    });
  });

  describe('POST /invitations/:token/accept', () => {
    it('should accept invitation', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
      const invitation = await createTestInvitation(prisma, admin!.id, {
        email: 'accept@example.com',
        tenantId,
      });

      const newUser = await createTestUser(prisma, { email: 'accept@example.com' });

      const userLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'accept@example.com', password: 'password' });

      const userToken = userLogin.body.accessToken;

      await request(app.getHttpServer())
        .post(`/api/v1/invitations/${invitation.token}/accept`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      const accepted = await prisma.userInvitation.findUnique({
        where: { id: invitation.id },
      });

      expect(accepted!.acceptedAt).toBeDefined();

      const userTenant = await prisma.userTenant.findFirst({
        where: { userId: newUser.id, tenantId },
      });

      expect(userTenant).toBeDefined();
    });
  });
});
