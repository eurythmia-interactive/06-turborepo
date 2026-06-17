import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
  AuthProviderType: { LOCAL: 'LOCAL', GITHUB: 'GITHUB', GOOGLE: 'GOOGLE' },
}));

import { UnauthorizedException } from '@nestjs/common';
import { type ExecutionContext } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@repo/database';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { type TokenPayloadFactory } from '../utilities/token-payload.factory.js';
import { type AccessTokenPayload } from '../interfaces/token-payload.interface.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let tokenPayloadFactory: TokenPayloadFactory;
  let mockRequest: Record<string, unknown>;

  function createExecutionContext(headers: Record<string, string> = {}): ExecutionContext {
    mockRequest = {
      headers,
      user: undefined,
    };

    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;

    tokenPayloadFactory = {
      verifyAccessToken: vi.fn(),
    } as unknown as TokenPayloadFactory;

    guard = new JwtAuthGuard(reflector, tokenPayloadFactory);
  });

  describe('public routes', () => {
    it('should allow access when route is marked as public', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const context = createExecutionContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should not attempt token verification for public routes', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const context = createExecutionContext();

      guard.canActivate(context);

      expect(tokenPayloadFactory.verifyAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('missing token', () => {
    it('should throw UnauthorizedException when no authorization header', () => {
      const context = createExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw with "Missing access token" message', () => {
      const context = createExecutionContext({});

      try {
        guard.canActivate(context);
      } catch (e) {
        expect((e as UnauthorizedException).message).toBe('Missing access token');
      }
    });

    it('should throw when authorization header has no Bearer prefix', () => {
      const context = createExecutionContext({ authorization: 'Token abc' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw when authorization header is just "Bearer" with no token', () => {
      const context = createExecutionContext({ authorization: 'Bearer' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('invalid token', () => {
    it('should throw UnauthorizedException when token verification fails', () => {
      (tokenPayloadFactory.verifyAccessToken as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('invalid');
      });
      const context = createExecutionContext({ authorization: 'Bearer bad-token' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw with "Invalid or expired token" message', () => {
      (tokenPayloadFactory.verifyAccessToken as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('expired');
      });
      const context = createExecutionContext({ authorization: 'Bearer expired-token' });

      try {
        guard.canActivate(context);
      } catch (e) {
        expect((e as UnauthorizedException).message).toBe('Invalid or expired token');
      }
    });
  });

  describe('valid token', () => {
    const payload: AccessTokenPayload = {
      sub: 'user-123',
      tenantId: 'tenant-456',
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
      iat: 1000,
      exp: 2000,
    };

    it('should return true for valid token', () => {
      (tokenPayloadFactory.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(payload);
      const context = createExecutionContext({ authorization: 'Bearer valid-token' });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should enrich request.user with userId from payload.sub', () => {
      (tokenPayloadFactory.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(payload);
      const context = createExecutionContext({ authorization: 'Bearer valid-token' });

      guard.canActivate(context);

      expect(mockRequest.user).toEqual({
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
      });
    });

    it('should call verifyAccessToken with the extracted token', () => {
      (tokenPayloadFactory.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(payload);
      const context = createExecutionContext({ authorization: 'Bearer my-jwt-token' });

      guard.canActivate(context);

      expect(tokenPayloadFactory.verifyAccessToken).toHaveBeenCalledWith('my-jwt-token');
    });

    it('should map all payload fields to AuthenticatedUser', () => {
      const adminPayload: AccessTokenPayload = {
        sub: 'admin-1',
        tenantId: 't-1',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        iat: 1000,
        exp: 2000,
      };
      (tokenPayloadFactory.verifyAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(
        adminPayload,
      );
      const context = createExecutionContext({ authorization: 'Bearer token' });

      guard.canActivate(context);

      const user = mockRequest.user as Record<string, string>;
      expect(user.userId).toBe('admin-1');
      expect(user.tenantId).toBe('t-1');
      expect(user.role).toBe(Role.SUPER_ADMIN);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });
  });
});
