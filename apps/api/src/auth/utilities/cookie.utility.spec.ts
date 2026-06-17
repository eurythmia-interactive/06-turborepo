import { describe, it, expect, vi } from 'vitest';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  type CookieConfig,
} from './cookie.utility.js';

describe('Cookie Utilities', () => {
  function createMockResponse() {
    return {
      cookie: vi.fn(),
    } as unknown as { cookie: ReturnType<typeof vi.fn> };
  }

  describe('setRefreshTokenCookie', () => {
    it('should set cookie with correct name and token', () => {
      const res = createMockResponse();
      const config: CookieConfig = { secure: true, maxAge: 604800000 };

      setRefreshTokenCookie(res as never, 'my-token', config);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'my-token',
        expect.objectContaining({}),
      );
    });

    it('should set httpOnly to true', () => {
      const res = createMockResponse();
      const config: CookieConfig = { secure: true, maxAge: 604800000 };

      setRefreshTokenCookie(res as never, 'token', config);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.httpOnly).toBe(true);
    });

    it('should set secure from config', () => {
      const res = createMockResponse();
      const config: CookieConfig = { secure: true, maxAge: 604800000 };

      setRefreshTokenCookie(res as never, 'token', config);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.secure).toBe(true);
    });

    it('should set secure to false when config says so', () => {
      const res = createMockResponse();
      const config: CookieConfig = { secure: false, maxAge: 604800000 };

      setRefreshTokenCookie(res as never, 'token', config);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.secure).toBe(false);
    });

    it('should set sameSite to lax', () => {
      const res = createMockResponse();
      const config: CookieConfig = { secure: true, maxAge: 604800000 };

      setRefreshTokenCookie(res as never, 'token', config);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.sameSite).toBe('lax');
    });

    it('should set path to /api/v1/auth/refresh', () => {
      const res = createMockResponse();
      const config: CookieConfig = { secure: true, maxAge: 604800000 };

      setRefreshTokenCookie(res as never, 'token', config);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.path).toBe('/api/v1/auth/refresh');
    });

    it('should set maxAge from config', () => {
      const res = createMockResponse();
      const config: CookieConfig = { secure: true, maxAge: 3600000 };

      setRefreshTokenCookie(res as never, 'token', config);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.maxAge).toBe(3600000);
    });

    it('should default maxAge to 7 days when config maxAge is 0', () => {
      const res = createMockResponse();
      const config: CookieConfig = { secure: true, maxAge: 0 };

      setRefreshTokenCookie(res as never, 'token', config);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('clearRefreshTokenCookie', () => {
    it('should set cookie with empty value', () => {
      const res = createMockResponse();

      clearRefreshTokenCookie(res as never);

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', '', expect.objectContaining({}));
    });

    it('should set expires to epoch (new Date(0))', () => {
      const res = createMockResponse();

      clearRefreshTokenCookie(res as never);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.expires).toEqual(new Date(0));
    });

    it('should set httpOnly to true', () => {
      const res = createMockResponse();

      clearRefreshTokenCookie(res as never);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.httpOnly).toBe(true);
    });

    it('should set path to /api/v1/auth/refresh', () => {
      const res = createMockResponse();

      clearRefreshTokenCookie(res as never);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.path).toBe('/api/v1/auth/refresh');
    });

    it('should set secure to true', () => {
      const res = createMockResponse();

      clearRefreshTokenCookie(res as never);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.secure).toBe(true);
    });

    it('should set sameSite to lax', () => {
      const res = createMockResponse();

      clearRefreshTokenCookie(res as never);

      const opts = (res.cookie as ReturnType<typeof vi.fn>).mock.calls[0]![2]!;
      expect(opts.sameSite).toBe('lax');
    });
  });

  describe('getRefreshTokenFromCookie', () => {
    it('should return token from cookies object', () => {
      const cookies = { refreshToken: 'abc123', other: 'val' };
      expect(getRefreshTokenFromCookie(cookies)).toBe('abc123');
    });

    it('should return null when refreshToken cookie is missing', () => {
      const cookies = { other: 'val' };
      expect(getRefreshTokenFromCookie(cookies)).toBeNull();
    });

    it('should return null when cookies is undefined', () => {
      expect(getRefreshTokenFromCookie(undefined)).toBeNull();
    });

    it('should return null when cookies is empty object', () => {
      expect(getRefreshTokenFromCookie({})).toBeNull();
    });

    it('should return empty string if cookie value is empty', () => {
      const cookies = { refreshToken: '' };
      expect(getRefreshTokenFromCookie(cookies)).toBe('');
    });
  });
});
