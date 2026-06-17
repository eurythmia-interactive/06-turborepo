import { describe, it, expect } from 'vitest';
import { validate } from './env.validation.js';

describe('env validation', () => {
  const validConfig = {
    NODE_ENV: 'production',
    PORT: '3001',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
    JWT_EXPIRES_IN_ACCESS: '15m',
    JWT_EXPIRES_IN_REFRESH: '7d',
    JWT_ISSUER: 'turborepo-api',
    JWT_AUDIENCE: 'turborepo-client',
    COOKIE_SECURE: 'false',
    CORS_ORIGINS: 'http://localhost:3000',
    THROTTLE_TTL: '60000',
    THROTTLE_LIMIT: '10',
  };

  it('should validate a correct config', () => {
    const result = validate(validConfig);
    expect(result.NODE_ENV).toBe('production');
    expect(result.PORT).toBe(3001);
    expect(result.JWT_EXPIRES_IN_ACCESS).toBe('15m');
  });

  it('should throw on missing required fields', () => {
    expect(() => validate({})).toThrow('Environment validation failed');
  });

  it('should throw on invalid JWT_SECRET length', () => {
    expect(() => validate({ ...validConfig, JWT_SECRET: 'too-short' })).toThrow(
      'Environment validation failed',
    );
  });

  it('should parse CORS_ORIGINS as array', () => {
    const result = validate({
      ...validConfig,
      CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
    });
    expect(result.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });
});
