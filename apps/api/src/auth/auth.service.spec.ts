import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
  AuthProviderType: { LOCAL: 'LOCAL', GITHUB: 'GITHUB', GOOGLE: 'GOOGLE' },
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProviderType, Role, UserStatus } from '@repo/database';
import { AuthService } from './auth.service.js';
import { type TokenPayloadFactory } from './utilities/token-payload.factory.js';
import { type JwtConfigService } from './config/jwt-config.service.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-value'),
  verify: vi.fn().mockResolvedValue(true),
}));

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual('node:crypto');
  return {
    ...actual,
    createHash: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        digest: vi.fn().mockReturnValue('sha256-hashed-value'),
      }),
    }),
    randomUUID: vi.fn().mockReturnValue('test-uuid'),
  };
});

import { hash, verify } from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    authenticationProvider: { findFirst: ReturnType<typeof vi.fn> };
    user: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    userTenant: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  };
  let tokenPayloadFactory: TokenPayloadFactory;
  let jwtConfigService: JwtConfigService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: Role.MEMBER,
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    tenants: [
      {
        tenant: { id: 'tenant-1', name: 'Test Tenant', slug: 'test-tenant' },
      },
    ],
  };

  const mockProvider = {
    id: 'provider-1',
    type: AuthProviderType.LOCAL,
    providerUserId: 'test@example.com',
    passwordHash: 'hashed-password',
    userId: 'user-1',
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-value');

    prisma = {
      authenticationProvider: {
        findFirst: vi.fn(),
      },
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      userTenant: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    tokenPayloadFactory = {
      signAccessToken: vi.fn().mockResolvedValue('access-token'),
      createRefreshTokenData: vi.fn().mockReturnValue({
        sessionId: 'session-1',
        familyId: 'family-1',
        rawToken: 'raw-refresh-token',
      }),
      verifyAccessToken: vi.fn(),
      signRefreshToken: vi.fn().mockResolvedValue('refresh-jwt'),
    } as unknown as TokenPayloadFactory;

    jwtConfigService = {
      get: vi.fn().mockReturnValue({
        algorithm: 'HS256',
        secret: 'secret',
        issuer: 'turborepo-api',
        audience: 'turborepo-client',
        accessExpiresIn: '15m',
        refreshExpiresIn: '7d',
      }),
    } as unknown as JwtConfigService;

    service = new AuthService(prisma as never, tokenPayloadFactory, jwtConfigService);
  });

  describe('login', () => {
    it('should return tokens and user data with valid credentials', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProvider,
      );

      const result = await service.login('test@example.com', 'Password1!');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'raw-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: Role.MEMBER,
        },
        tenants: [{ id: 'tenant-1', name: 'Test Tenant', slug: 'test-tenant' }],
      });
    });

    it('should look up provider by lowercase email', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProvider,
      );

      await service.login('TEST@EXAMPLE.COM', 'Password1!');

      expect(prisma.authenticationProvider.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            providerUserId: 'test@example.com',
          }),
        }),
      );
    });

    it('should verify password with argon2', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProvider,
      );

      await service.login('test@example.com', 'Password1!');

      expect(verify).toHaveBeenCalledWith('hashed-password', 'Password1!');
    });

    it('should create a refresh token in the database', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProvider,
      );

      await service.login('test@example.com', 'Password1!');

      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'session-1',
            userId: 'user-1',
            tokenHash: 'sha256-hashed-value',
            familyId: 'family-1',
          }),
        }),
      );
    });

    it('should throw UnauthorizedException when provider not found', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.login('test@example.com', 'Password1!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password hash is null', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockProvider,
        passwordHash: null,
      });

      await expect(service.login('test@example.com', 'Password1!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProvider,
      );
      (verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when user is suspended', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockProvider,
        user: { ...mockUser, status: UserStatus.SUSPENDED },
      });

      await expect(service.login('test@example.com', 'Password1!')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should use "none" as default tenant when user has no tenants', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockProvider,
        user: { ...mockUser, tenants: [] },
      });

      await service.login('test@example.com', 'Password1!');

      expect(tokenPayloadFactory.signAccessToken).toHaveBeenCalledWith(
        'user-1',
        'none',
        Role.MEMBER,
        UserStatus.ACTIVE,
        undefined,
      );
    });
  });

  describe('register', () => {
    const registerInput = {
      email: 'new@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      name: 'New User',
    };

    it('should create user and return tokens', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await service.register(registerInput);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'raw-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: Role.MEMBER,
        },
        tenants: [{ id: 'tenant-1', name: 'Test Tenant', slug: 'test-tenant' }],
      });
    });

    it('should hash the password before creating user', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await service.register(registerInput);

      expect(hash).toHaveBeenCalledWith('Password1!');
    });

    it('should create user with correct data', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await service.register(registerInput);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            name: 'New User',
            status: UserStatus.ACTIVE,
            role: Role.MEMBER,
          }),
        }),
      );
    });

    it('should create authentication provider for the user', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await service.register(registerInput);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providers: {
              create: expect.objectContaining({
                type: AuthProviderType.LOCAL,
                providerUserId: 'new@example.com',
                passwordHash: 'hashed-value',
              }),
            },
          }),
        }),
      );
    });

    it('should create a refresh token in the database', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await service.register(registerInput);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'session-1',
            userId: 'user-1',
            tokenHash: 'sha256-hashed-value',
            familyId: 'family-1',
          }),
        }),
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProvider,
      );

      await expect(service.register(registerInput)).rejects.toThrow(ConflictException);
    });

    it('should not create user when email already exists', async () => {
      (prisma.authenticationProvider.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProvider,
      );

      await expect(service.register(registerInput)).rejects.toThrow();

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    const existingToken = {
      id: 'session-1',
      userId: 'user-1',
      tokenHash: 'sha256-hashed-value',
      familyId: 'family-1',
      revoked: false,
      expiresAt: new Date(Date.now() + 86400000),
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
      },
      replaces: null,
    };

    it('should return new token pair on valid refresh', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingToken);
      (prisma.refreshToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.userTenant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        tenantId: 'tenant-1',
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
    });

    it('should hash the incoming raw refresh token', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingToken);
      (prisma.refreshToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.userTenant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        tenantId: 'tenant-1',
      });

      await service.refreshTokens('valid-refresh-token');

      const { createHash } = await import('node:crypto');
      expect(createHash).toHaveBeenCalledWith('sha256');
    });

    it('should revoke the old token and create a new one', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingToken);
      (prisma.refreshToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.userTenant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        tenantId: 'tenant-1',
      });

      await service.refreshTokens('valid-refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({ revoked: true }),
        }),
      );
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is not found', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should detect token reuse and revoke the entire family', async () => {
      const revokedToken = {
        ...existingToken,
        revoked: true,
        replaces: { familyId: 'family-1' },
      };
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(revokedToken);

      await expect(service.refreshTokens('reused-token')).rejects.toThrow(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        data: { revoked: true },
      });
    });

    it('should use own familyId when replaces is null on revoked token', async () => {
      const revokedToken = {
        ...existingToken,
        revoked: true,
        replaces: null,
      };
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(revokedToken);

      await expect(service.refreshTokens('reused-token')).rejects.toThrow();

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        data: { revoked: true },
      });
    });

    it('should revoke expired token and throw', async () => {
      const expiredToken = {
        ...existingToken,
        expiresAt: new Date(Date.now() - 86400000),
      };
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(expiredToken);

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: { revoked: true },
        }),
      );
    });

    it('should sign new access token with user data', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingToken);
      (prisma.refreshToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.userTenant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        tenantId: 'tenant-1',
      });

      await service.refreshTokens('valid-refresh-token');

      expect(tokenPayloadFactory.signAccessToken).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        Role.MEMBER,
        UserStatus.ACTIVE,
        undefined,
      );
    });

    it('should use "none" as tenantId when no membership found', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingToken);
      (prisma.refreshToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.userTenant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.refreshTokens('valid-refresh-token');

      expect(tokenPayloadFactory.signAccessToken).toHaveBeenCalledWith(
        'user-1',
        'none',
        Role.MEMBER,
        UserStatus.ACTIVE,
        undefined,
      );
    });
  });

  describe('logout', () => {
    it('should revoke the token when found', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'session-1',
      });

      await service.logout('valid-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revoked: true },
      });
    });

    it('should hash the raw refresh token', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'session-1',
      });

      await service.logout('my-token');

      const { createHash } = await import('node:crypto');
      expect(createHash).toHaveBeenCalledWith('sha256');
    });

    it('should not throw when token is not found', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.logout('invalid-token')).resolves.toBeUndefined();
    });

    it('should not call update when token is not found', async () => {
      (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.logout('invalid-token');

      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  const mockProfileUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    role: Role.MEMBER,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('getProfile', () => {
    it('should return user data with serialized dates', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfileUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
        createdAt: mockProfileUser.createdAt.toISOString(),
        updatedAt: mockProfileUser.updatedAt.toISOString(),
      });
    });

    it('should query by userId', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfileUser);

      await service.getProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        }),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should return updated user with serialized dates', async () => {
      const updatedUser = { ...mockProfileUser, name: 'Updated Name' };
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', { name: 'Updated Name' });

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Updated Name',
        image: null,
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
        createdAt: mockProfileUser.createdAt.toISOString(),
        updatedAt: mockProfileUser.updatedAt.toISOString(),
      });
    });

    it('should update name when provided', async () => {
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfileUser);

      await service.updateProfile('user-1', { name: 'New Name' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
    });

    it('should update image when provided', async () => {
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await service.updateProfile('user-1', { image: 'https://example.com/pic.jpg' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ image: 'https://example.com/pic.jpg' }),
        }),
      );
    });

    it('should not include name in data when not provided', async () => {
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await service.updateProfile('user-1', { image: 'https://example.com/pic.jpg' });

      const data = (prisma.user.update as ReturnType<typeof vi.fn>).mock.calls[0]![0].data;
      expect(data).not.toHaveProperty('name');
    });

    it('should not include image in data when not provided', async () => {
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      await service.updateProfile('user-1', { name: 'New Name' });

      const data = (prisma.user.update as ReturnType<typeof vi.fn>).mock.calls[0]![0].data;
      expect(data).not.toHaveProperty('image');
    });
  });

  describe('selectTenant', () => {
    it('should issue new access token for valid tenant selection', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (prisma.userTenant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
      });

      const result = await service.selectTenant('user-1', 'tenant-1');

      expect(result).toEqual({ accessToken: 'access-token' });
    });

    it('should sign token with selected tenantId', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (prisma.userTenant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-2',
      });

      await service.selectTenant('user-1', 'tenant-2');

      expect(tokenPayloadFactory.signAccessToken).toHaveBeenCalledWith(
        'user-1',
        'tenant-2',
        Role.MEMBER,
        UserStatus.ACTIVE,
        undefined,
      );
    });

    it('should allow SUPER_ADMIN to select any tenant without membership check', async () => {
      const superAdmin = { ...mockUser, role: Role.SUPER_ADMIN };
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(superAdmin);

      const result = await service.selectTenant('user-1', 'any-tenant');

      expect(result).toEqual({ accessToken: 'access-token' });
      expect(prisma.userTenant.findUnique).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not belong to tenant', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (prisma.userTenant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.selectTenant('user-1', 'other-tenant')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.selectTenant('nonexistent', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
