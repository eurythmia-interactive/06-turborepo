import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
  AuthProviderType: { LOCAL: 'LOCAL', GITHUB: 'GITHUB', GOOGLE: 'GOOGLE' },
}));

import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@repo/database';
import { PermissionsGuard } from './permissions.guard.js';
import type { AuthenticatedUser } from '../interfaces/token-payload.interface.js';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
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

    guard = new PermissionsGuard(reflector);
  });

  describe('no permissions required', () => {
    it('should allow access when no permissions decorator is set', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      const context = createExecutionContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when permissions array is empty', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const context = createExecutionContext();

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('user has required permissions', () => {
    it('should allow SUPER_ADMIN access to all permissions', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([
        'user:read',
        'user:write',
        'user:delete',
        'tenant:read',
        'tenant:write',
        'tenant:delete',
        'admin:access',
        'system:config',
      ]);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow MEMBER to read users', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(['user:read']);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow ADMIN to write users', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(['user:write']);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow GUEST to read users', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(['user:read']);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.GUEST,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow when user has all required permissions', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(['user:read']);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.GUEST,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('user lacks required permissions', () => {
    it('should throw ForbiddenException when GUEST tries to write users', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(['user:write']);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.GUEST,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw with "Insufficient permissions" message', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(['tenant:delete']);
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
        expect((e as ForbiddenException).message).toBe('Insufficient permissions');
      }
    });

    it('should throw when user has some but not all required permissions', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([
        'user:read',
        'tenant:delete',
      ]);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw when ADMIN tries to impersonate users', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue([
        'user:impersonate',
      ]);
      const context = createExecutionContext();
      mockRequest.user = {
        userId: 'u1',
        tenantId: 't1',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      } satisfies AuthenticatedUser;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('no user on request', () => {
    it('should throw ForbiddenException when user is not on request', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(['user:read']);
      const context = createExecutionContext();

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw with "User not authenticated" message', () => {
      (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValue(['user:read']);
      const context = createExecutionContext();

      try {
        guard.canActivate(context);
      } catch (e) {
        expect((e as ForbiddenException).message).toBe('User not authenticated');
      }
    });
  });
});
