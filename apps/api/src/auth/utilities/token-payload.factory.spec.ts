import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
  AuthProviderType: { LOCAL: 'LOCAL', GITHUB: 'GITHUB', GOOGLE: 'GOOGLE' },
}));

import { type JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@repo/database';
import { TokenPayloadFactory } from './token-payload.factory.js';
import { type JwtConfig } from '../config/jwt-config.service.js';

describe('TokenPayloadFactory', () => {
  let jwtService: JwtService;
  let jwtConfigService: { get: ReturnType<typeof vi.fn> };
  let factory: TokenPayloadFactory;

  const hs256Config: JwtConfig = {
    secret: 'test-secret',
    algorithm: 'HS256',
    issuer: 'turborepo-api',
    audience: 'turborepo-client',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  };

  const rs256Config: JwtConfig = {
    privateKey: '-----BEGIN PRIVATE KEY-----\npriv\n-----END PRIVATE KEY-----',
    publicKey: '-----BEGIN PUBLIC KEY-----\npub\n-----END PUBLIC KEY-----',
    algorithm: 'RS256',
    issuer: 'turborepo-api',
    audience: 'turborepo-client',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  };

  beforeEach(() => {
    jwtService = {
      sign: vi.fn().mockReturnValue('signed-token'),
      signAsync: vi.fn().mockResolvedValue('signed-token'),
      verify: vi.fn(),
    } as unknown as JwtService;

    jwtConfigService = {
      get: vi.fn().mockReturnValue(hs256Config),
    };

    factory = new TokenPayloadFactory(jwtService, jwtConfigService as never);
  });

  describe('signAccessToken', () => {
    it('should sign with HS256 using module-level secret', async () => {
      const token = await factory.signAccessToken(
        'user-1',
        'tenant-1',
        Role.MEMBER,
        UserStatus.ACTIVE,
      );

      expect(token).toBe('signed-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          tenantId: 'tenant-1',
          role: Role.MEMBER,
          status: UserStatus.ACTIVE,
        }),
        expect.objectContaining({
          expiresIn: '15m',
        }),
      );
    });

    it('should sign with RS256 privateKey when configured', async () => {
      jwtConfigService.get.mockReturnValue(rs256Config);

      const token = await factory.signAccessToken(
        'user-1',
        'tenant-1',
        Role.ADMIN,
        UserStatus.ACTIVE,
      );

      expect(token).toBe('signed-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          tenantId: 'tenant-1',
          role: Role.ADMIN,
        }),
        expect.objectContaining({
          expiresIn: '15m',
          algorithm: 'RS256',
          privateKey: rs256Config.privateKey,
        }),
      );
    });

    it('should include all required payload fields', async () => {
      await factory.signAccessToken('u1', 't1', Role.GUEST, UserStatus.PENDING);

      const payload = (jwtService.signAsync as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(payload).toEqual(
        expect.objectContaining({
          sub: 'u1',
          tenantId: 't1',
          role: Role.GUEST,
          status: UserStatus.PENDING,
        }),
      );
      expect(payload).not.toHaveProperty('iat');
      expect(payload).not.toHaveProperty('exp');
    });
  });

  describe('createRefreshTokenData', () => {
    it('should return sessionId, familyId, and rawToken', () => {
      const data = factory.createRefreshTokenData();

      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('familyId');
      expect(data).toHaveProperty('rawToken');
      expect(typeof data.sessionId).toBe('string');
      expect(typeof data.familyId).toBe('string');
      expect(typeof data.rawToken).toBe('string');
    });

    it('should generate UUID-formatted sessionId and familyId', () => {
      const data = factory.createRefreshTokenData();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(data.sessionId).toMatch(uuidRegex);
      expect(data.familyId).toMatch(uuidRegex);
    });

    it('should generate unique sessionId and familyId', () => {
      const data = factory.createRefreshTokenData();
      expect(data.sessionId).not.toBe(data.familyId);
    });

    it('should generate a hex rawToken', () => {
      const data = factory.createRefreshTokenData();
      expect(data.rawToken).toMatch(/^[0-9a-f]+$/);
      expect(data.rawToken).toHaveLength(64);
    });
  });

  describe('signRefreshToken', () => {
    it('should sign with HS256 using module-level secret', async () => {
      const token = await factory.signRefreshToken('user-1', 'session-1', 'family-1');

      expect(token).toBe('signed-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          sessionId: 'session-1',
          familyId: 'family-1',
        }),
        expect.objectContaining({
          expiresIn: '7d',
        }),
      );
    });

    it('should sign with RS256 privateKey when configured', async () => {
      jwtConfigService.get.mockReturnValue(rs256Config);

      await factory.signRefreshToken('user-1', 'session-1', 'family-1');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          sessionId: 'session-1',
          familyId: 'family-1',
        }),
        expect.objectContaining({
          expiresIn: '7d',
          algorithm: 'RS256',
          privateKey: rs256Config.privateKey,
        }),
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify with module-level secret for HS256', () => {
      const payload = {
        sub: 'user-1',
        tenantId: 't1',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
      };
      (jwtService.verify as ReturnType<typeof vi.fn>).mockReturnValue(payload);

      const result = factory.verifyAccessToken('valid-token');

      expect(result).toEqual(payload);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should verify with RS256 publicKey when configured', () => {
      jwtConfigService.get.mockReturnValue(rs256Config);
      const payload = {
        sub: 'user-1',
        tenantId: 't1',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      };
      (jwtService.verify as ReturnType<typeof vi.fn>).mockReturnValue(payload);

      const result = factory.verifyAccessToken('valid-token');

      expect(result).toEqual(payload);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        publicKey: rs256Config.publicKey,
        algorithms: ['RS256'],
      });
    });

    it('should throw when token is expired', () => {
      (jwtService.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => factory.verifyAccessToken('expired-token')).toThrow('jwt expired');
    });

    it('should throw when token is invalid', () => {
      (jwtService.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      expect(() => factory.verifyAccessToken('bad-token')).toThrow('invalid signature');
    });
  });
});
