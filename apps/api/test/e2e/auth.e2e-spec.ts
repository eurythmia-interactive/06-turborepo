import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { hash } from 'argon2';
import { AuthModule } from '../../src/auth/auth.module.js';
import { DatabaseModule, PRISMA_CLIENT } from '../../src/database/database.module.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';
import { getTestPrismaClient, cleanTestDatabase } from '../helpers/test-db.js';
import { createTestUser } from '../helpers/fixtures.js';
import { validate } from '../../src/config/env.validation.js';
import cookieParser from 'cookie-parser';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard.js';
import type { PrismaClient } from '@repo/database';

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

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
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
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
  });

  describe('Registration flow', () => {
    it('POST /api/v1/auth/register creates user, returns tokens, sets cookie', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body).toHaveProperty('tenants');
      expect(Array.isArray(response.body.tenants)).toBe(true);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshTokenCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('refreshToken='))
        : cookies;
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('POST /api/v1/auth/register rejects duplicate email with 409', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      };

      await request(app.getHttpServer()).post('/api/v1/auth/register').send(userData);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.statusCode).toBe(409);
    });

    it('POST /api/v1/auth/register validates password strength', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: 'weak@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toHaveProperty('password');
    });

    it('POST /api/v1/auth/register validates email format', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: 'not-an-email',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty('email');
    });

    it('POST /api/v1/auth/register validates password match', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: 'mismatch@example.com',
        password: 'Password1!',
        confirmPassword: 'Password2!',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty('confirmPassword');
    });
  });

  describe('Login flow', () => {
    const testEmail = 'login@example.com';
    const testPassword = 'Password1!';

    beforeEach(async () => {
      const passwordHash = await hash(testPassword);
      await createTestUser(prisma, {
        email: testEmail,
        passwordHash,
      });
    });

    it('POST /api/v1/auth/login with valid credentials returns tokens', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body).toHaveProperty('tenants');
    });

    it('POST /api/v1/auth/login with invalid credentials returns 401', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'WrongPassword1!',
      });

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
    });

    it('POST /api/v1/auth/login with non-existent user returns 401', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: testPassword,
      });

      expect(response.status).toBe(401);
    });

    it('POST /api/v1/auth/login sets httpOnly refresh cookie', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshTokenCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('refreshToken='))
        : cookies;
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('Path=/api/v1/auth/refresh');
    });
  });

  describe('Token refresh', () => {
    const testEmail = 'refresh@example.com';
    const testPassword = 'Password1!';

    it('POST /api/v1/auth/refresh with valid cookie returns new access token', async () => {
      const passwordHash = await hash(testPassword);
      await createTestUser(prisma, {
        email: testEmail,
        passwordHash,
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(loginResponse.status).toBe(200);
      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshTokenCookieFull = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('refreshToken='))
        : cookies;
      expect(refreshTokenCookieFull).toBeDefined();
      const refreshTokenCookie = refreshTokenCookieFull?.split(';')[0];
      expect(refreshTokenCookie).toContain('refreshToken=');

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('accessToken');
    });

    it('POST /api/v1/auth/refresh without cookie returns 401', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/refresh');

      expect(response.status).toBe(401);
    });

    it('POST /api/v1/auth/refresh with invalid cookie returns 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Profile', () => {
    const testEmail = 'profile@example.com';
    const testPassword = 'Password1!';
    let accessToken: string;

    beforeEach(async () => {
      const passwordHash = await hash(testPassword);
      await createTestUser(prisma, {
        email: testEmail,
        name: 'Profile User',
        passwordHash,
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      accessToken = loginResponse.body.accessToken;
    });

    it('GET /api/v1/auth/profile returns user data for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', testEmail);
      expect(response.body).toHaveProperty('name', 'Profile User');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('GET /api/v1/auth/profile returns 401 without token', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/auth/profile');

      expect(response.status).toBe(401);
    });

    it('GET /api/v1/auth/profile returns 401 with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/auth/profile updates user data', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.email).toBe(testEmail);
    });

    it('PATCH /api/v1/auth/profile validates input', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveProperty('name');
    });

    it('PATCH /api/v1/auth/profile returns 401 without token', async () => {
      const response = await request(app.getHttpServer()).patch('/api/v1/auth/profile').send({
        name: 'Updated Name',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Logout', () => {
    const testEmail = 'logout@example.com';
    const testPassword = 'Password1!';

    it('POST /api/v1/auth/logout clears cookie and revokes token', async () => {
      const passwordHash = await hash(testPassword);
      await createTestUser(prisma, {
        email: testEmail,
        passwordHash,
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(loginResponse.status).toBe(200);
      const cookies = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('refreshToken='))
        : cookies;

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .set('Cookie', refreshTokenCookie);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.message).toBe('Logged out successfully');

      const logoutCookies = logoutResponse.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();
      const clearedCookie = Array.isArray(logoutCookies)
        ? logoutCookies.find((c: string) => c.startsWith('refreshToken='))
        : logoutCookies;
      expect(clearedCookie).toBeDefined();
      expect(clearedCookie).toContain('refreshToken=;');

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie);

      expect(refreshResponse.status).toBe(401);
    });

    it('POST /api/v1/auth/logout without cookie still returns 200', async () => {
      const passwordHash = await hash(testPassword);
      const user = await createTestUser(prisma, {
        email: testEmail,
        passwordHash,
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.message).toBe('Logged out successfully');
    });
  });

  describe('Full auth flow', () => {
    it('register → login → refresh → profile → logout → verify old token revoked', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'fullflow@example.com',
          password: 'Password1!',
          confirmPassword: 'Password1!',
        });

      expect(registerResponse.status).toBe(201);
      const registerAccessToken = registerResponse.body.accessToken;
      const registerCookies = registerResponse.headers['set-cookie'];
      const registerRefreshCookieFull = Array.isArray(registerCookies)
        ? registerCookies.find((c: string) => c.startsWith('refreshToken='))
        : registerCookies;
      const registerRefreshCookie = registerRefreshCookieFull?.split(';')[0];

      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'fullflow@example.com',
        password: 'Password1!',
      });

      expect(loginResponse.status).toBe(200);
      const loginAccessToken = loginResponse.body.accessToken;
      const loginCookies = loginResponse.headers['set-cookie'];
      const loginRefreshCookieFull = Array.isArray(loginCookies)
        ? loginCookies.find((c: string) => c.startsWith('refreshToken='))
        : loginCookies;
      const loginRefreshCookie = loginRefreshCookieFull?.split(';')[0];

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', loginRefreshCookie);

      expect(refreshResponse.status).toBe(200);
      const refreshedAccessToken = refreshResponse.body.accessToken;

      const refreshCookies = refreshResponse.headers['set-cookie'];
      const newRefreshCookieFull = Array.isArray(refreshCookies)
        ? refreshCookies.find((c: string) => c.startsWith('refreshToken='))
        : refreshCookies;
      const newRefreshCookie = newRefreshCookieFull?.split(';')[0];

      const profileResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${refreshedAccessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.email).toBe('fullflow@example.com');

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${refreshedAccessToken}`)
        .set('Cookie', newRefreshCookie);

      expect(logoutResponse.status).toBe(200);

      const profileAfterLogout = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${refreshedAccessToken}`);

      expect(profileAfterLogout.status).toBe(200);

      const refreshAfterLogout = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', newRefreshCookie);

      expect(refreshAfterLogout.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    const testEmail = 'rbac@example.com';
    const testPassword = 'Password1!';

    it('Protected routes return 401 without token', async () => {
      const profileResponse = await request(app.getHttpServer()).get('/api/v1/auth/profile');
      expect(profileResponse.status).toBe(401);

      const updateProfileResponse = await request(app.getHttpServer())
        .patch('/api/v1/auth/profile')
        .send({ name: 'Test' });
      expect(updateProfileResponse.status).toBe(401);

      const logoutResponse = await request(app.getHttpServer()).post('/api/v1/auth/logout');
      expect(logoutResponse.status).toBe(401);
    });

    it('Protected routes return 200 with valid token', async () => {
      const passwordHash = await hash(testPassword);
      await createTestUser(prisma, {
        email: testEmail,
        passwordHash,
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(loginResponse.status).toBe(200);
      const accessToken = loginResponse.body.accessToken;

      const profileResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(profileResponse.status).toBe(200);

      const updateProfileResponse = await request(app.getHttpServer())
        .patch('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated' });
      expect(updateProfileResponse.status).toBe(200);
    });

    it('Public routes are accessible without token', async () => {
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Password1!',
      });

      expect(loginResponse.status).toBe(401);

      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'public@example.com',
          password: 'Password1!',
          confirmPassword: 'Password1!',
        });

      expect(registerResponse.status).toBe(201);
    });
  });
});
