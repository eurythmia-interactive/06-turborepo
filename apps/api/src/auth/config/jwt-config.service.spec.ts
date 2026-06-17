import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtConfigService } from './jwt-config.service.js';

describe('JwtConfigService', () => {
  let configService: ConfigService;

  function createConfigService(overrides: Record<string, string> = {}): ConfigService {
    const values: Record<string, string> = { ...overrides };
    return {
      get: vi.fn((key: string, defaultValue?: string) => {
        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;
  }

  describe('HS256 fallback in development', () => {
    beforeEach(() => {
      configService = createConfigService({ NODE_ENV: 'development' });
    });

    it('should use HS256 algorithm', () => {
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.algorithm).toBe('HS256');
    });

    it('should not include publicKey or privateKey', () => {
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.publicKey).toBeUndefined();
      expect(config.privateKey).toBeUndefined();
    });

    it('should include default issuer and audience', () => {
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.issuer).toBe('turborepo-api');
      expect(config.audience).toBe('turborepo-client');
    });

    it('should include default expiry values', () => {
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.accessExpiresIn).toBe('15m');
      expect(config.refreshExpiresIn).toBe('7d');
    });

    it('should use custom JWT_SECRET when provided', () => {
      configService = createConfigService({
        NODE_ENV: 'development',
        JWT_SECRET: 'my-secret',
      });
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.secret).toBe('my-secret');
    });
  });

  describe('HS256 fallback when production but no keys', () => {
    it('should use HS256 when NODE_ENV=production but no keys provided', () => {
      configService = createConfigService({ NODE_ENV: 'production' });
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.algorithm).toBe('HS256');
    });
  });

  describe('RS256 configuration when keys are provided', () => {
    const privateKeyPem = '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';
    const publicKeyPem = '-----BEGIN PUBLIC KEY-----\nfake\n-----END PUBLIC KEY-----';

    beforeEach(() => {
      configService = createConfigService({
        NODE_ENV: 'production',
        JWT_PRIVATE_KEY: Buffer.from(privateKeyPem).toString('base64'),
        JWT_PUBLIC_KEY: Buffer.from(publicKeyPem).toString('base64'),
      });
    });

    it('should use RS256 algorithm', () => {
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.algorithm).toBe('RS256');
    });

    it('should decode base64 private key', () => {
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.privateKey).toBe(privateKeyPem);
    });

    it('should decode base64 public key', () => {
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.publicKey).toBe(publicKeyPem);
    });

    it('should not include secret', () => {
      const service = new JwtConfigService(configService);
      const config = service.get();
      expect(config.secret).toBeUndefined();
    });
  });

  describe('getSignOptions', () => {
    it('should return HS256 sign options in development', () => {
      configService = createConfigService({
        NODE_ENV: 'development',
        JWT_SECRET: 'test-secret',
      });
      const service = new JwtConfigService(configService);
      const opts = service.getSignOptions() as {
        algorithm: string;
        secret?: string;
        privateKey?: string;
        issuer: string;
        audience: string;
      };
      expect(opts.algorithm).toBe('HS256');
      expect(opts.secret).toBe('test-secret');
      expect(opts.issuer).toBe('turborepo-api');
      expect(opts.audience).toBe('turborepo-client');
    });

    it('should return RS256 sign options when keys are configured', () => {
      const privPem = '-----BEGIN PRIVATE KEY-----\npriv\n-----END PRIVATE KEY-----';
      const pubPem = '-----BEGIN PUBLIC KEY-----\npub\n-----END PUBLIC KEY-----';
      configService = createConfigService({
        NODE_ENV: 'production',
        JWT_PRIVATE_KEY: Buffer.from(privPem).toString('base64'),
        JWT_PUBLIC_KEY: Buffer.from(pubPem).toString('base64'),
      });
      const service = new JwtConfigService(configService);
      const opts = service.getSignOptions() as {
        algorithm: string;
        secret?: string;
        privateKey?: string;
        issuer: string;
        audience: string;
      };
      expect(opts.algorithm).toBe('RS256');
      expect(opts.privateKey).toBe(privPem);
    });
  });

  describe('getVerifyOptions', () => {
    it('should return HS256 verify options in development', () => {
      configService = createConfigService({
        NODE_ENV: 'development',
        JWT_SECRET: 'test-secret',
      });
      const service = new JwtConfigService(configService);
      const opts = service.getVerifyOptions() as {
        algorithms: readonly string[];
        secret?: string;
        publicKey?: string;
        issuer: string;
        audience: string;
      };
      expect(opts.algorithms).toEqual(['HS256']);
      expect(opts.secret).toBe('test-secret');
    });

    it('should return RS256 verify options when keys are configured', () => {
      const privPem = '-----BEGIN PRIVATE KEY-----\npriv\n-----END PRIVATE KEY-----';
      const pubPem = '-----BEGIN PUBLIC KEY-----\npub\n-----END PUBLIC KEY-----';
      configService = createConfigService({
        NODE_ENV: 'production',
        JWT_PRIVATE_KEY: Buffer.from(privPem).toString('base64'),
        JWT_PUBLIC_KEY: Buffer.from(pubPem).toString('base64'),
      });
      const service = new JwtConfigService(configService);
      const opts = service.getVerifyOptions() as {
        algorithms: readonly string[];
        secret?: string;
        publicKey?: string;
        issuer: string;
        audience: string;
      };
      expect(opts.algorithms).toEqual(['RS256']);
      expect(opts.publicKey).toBe(pubPem);
    });
  });

  describe('generateKeyPair', () => {
    it('should generate a valid RSA key pair', () => {
      const { privateKey, publicKey } = JwtConfigService.generateKeyPair();
      expect(privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(privateKey).toContain('-----END PRIVATE KEY-----');
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(publicKey).toContain('-----END PUBLIC KEY-----');
    });

    it('should generate unique key pairs on each call', () => {
      const pair1 = JwtConfigService.generateKeyPair();
      const pair2 = JwtConfigService.generateKeyPair();
      expect(pair1.privateKey).not.toBe(pair2.privateKey);
      expect(pair1.publicKey).not.toBe(pair2.publicKey);
    });
  });

  describe('generateRefreshToken', () => {
    it('should return a hex string', () => {
      const token = JwtConfigService.generateRefreshToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should return a 64-character hex string (32 bytes)', () => {
      const token = JwtConfigService.generateRefreshToken();
      expect(token).toHaveLength(64);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = JwtConfigService.generateRefreshToken();
      const token2 = JwtConfigService.generateRefreshToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('get returns a copy', () => {
    it('should return a new object on each call', () => {
      configService = createConfigService({ NODE_ENV: 'development' });
      const service = new JwtConfigService(configService);
      const a = service.get();
      const b = service.get();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });
});
