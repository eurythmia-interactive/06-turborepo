import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
  AuthProviderType: { LOCAL: 'LOCAL', GITHUB: 'GITHUB', GOOGLE: 'GOOGLE' },
}));

import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@repo/database';
import { RolesGuard } from './roles.guard.js';
import type { AuthenticatedUser } from '../interfaces/token-payload.interface.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockRequest: Record<string, unknown>;

  function createExecutionContext(): ExecutionContext {
    mockRequest = { user: undefined };
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
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    guard = new RolesGuard(reflector);
  });

  describe('no roles required', () => {
    it('should allow access when no roles decorator is set', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      const context = createExecutionContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const context = createExecutionContext();

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('user has required role', () => {
    it('should allow access when user has one of the required roles', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([
        Role.ADMIN,
        Role.MEMBER,
      ]);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user role matches exactly', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([Role.SUPER_ADMIN]);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('user lacks required role', () => {
    it('should throw ForbiddenException when user lacks required role', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([Role.ADMIN]);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.GUEST,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw with "Insufficient role" message', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([Role.SUPER_ADMIN]);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      try {
        guard.canActivate(context);
      } catch (e) {
        expect((e as ForbiddenException).message).toBe('Insufficient role');
      }
    });

    it('should throw when none of the multiple required roles match', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([
        Role.SUPER_ADMIN,
        Role.ADMIN,
      ]);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.GUEST,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('no user on request', () => {
    it('should throw ForbiddenException when user is not on request', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([Role.MEMBER]);
      const context = createExecutionContext();
      mockRequest.user = undefined;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw with "User not authenticated" message', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([Role.MEMBER]);
      const context = createExecutionContext();

      try {
        guard.canActivate(context);
      } catch (e) {
        expect((e as ForbiddenException).message).toBe('User not authenticated');
      }
    });
  });
});
