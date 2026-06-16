import { describe, it, expect } from 'vitest';
import { validate } from './env.validation.js';

describe('env.validation', () => {
  const validConfig = {
    NODE_ENV: 'development',
    PORT: '3001',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
    JWT_EXPIRES_IN: '7d',
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
  };

  it('should validate a complete config successfully', () => {
    const result = validate(validConfig);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3001);
    expect(result.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(result.JWT_SECRET).toBe('test-jwt-secret-key-for-testing-only-min-32-chars');
    expect(result.JWT_EXPIRES_IN).toBe('7d');
    expect(result.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('should apply defaults for optional fields', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
      CORS_ORIGINS: 'http://localhost:3000',
    };

    const result = validate(config);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3001);
    expect(result.JWT_EXPIRES_IN).toBe('7d');
  });

  it('should coerce PORT string to number', () => {
    const config = {
      ...validConfig,
      PORT: '4000',
    };

    const result = validate(config);
    expect(result.PORT).toBe(4000);
  });

  it('should throw when DATABASE_URL is missing', () => {
    const config = {
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
      CORS_ORIGINS: 'http://localhost:3000',
    };

    expect(() => validate(config)).toThrow('Environment validation failed');
  });

  it('should throw when DATABASE_URL is not a valid URL', () => {
    const config = {
      ...validConfig,
      DATABASE_URL: 'not-a-url',
    };

    expect(() => validate(config)).toThrow('Environment validation failed');
  });

  it('should throw when JWT_SECRET is missing', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      CORS_ORIGINS: 'http://localhost:3000',
    };

    expect(() => validate(config)).toThrow('Environment validation failed');
  });

  it('should throw when JWT_SECRET is too short', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'too-short',
      CORS_ORIGINS: 'http://localhost:3000',
    };

    expect(() => validate(config)).toThrow('Environment validation failed');
  });

  it('should throw when CORS_ORIGINS is missing', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
    };

    expect(() => validate(config)).toThrow('Environment validation failed');
  });

  it('should parse CORS_ORIGINS with spaces', () => {
    const config = {
      ...validConfig,
      CORS_ORIGINS: 'http://localhost:3000 , http://localhost:3001 , http://localhost:3002',
    };

    const result = validate(config);
    expect(result.CORS_ORIGINS).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ]);
  });

  it('should reject invalid NODE_ENV values', () => {
    const config = {
      ...validConfig,
      NODE_ENV: 'invalid',
    };

    expect(() => validate(config)).toThrow('Environment validation failed');
  });

  it('should accept valid NODE_ENV values', () => {
    for (const env of ['development', 'production', 'test']) {
      const config = { ...validConfig, NODE_ENV: env };
      const result = validate(config);
      expect(result.NODE_ENV).toBe(env);
    }
  });

  it('should reject negative PORT values', () => {
    const config = {
      ...validConfig,
      PORT: '-1',
    };

    expect(() => validate(config)).toThrow('Environment validation failed');
  });

  it('should reject non-integer PORT values', () => {
    const config = {
      ...validConfig,
      PORT: '3.14',
    };

    expect(() => validate(config)).toThrow('Environment validation failed');
  });
});
