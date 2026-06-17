import { describe, it, expect, vi } from 'vitest';
import { getAccessToken, getRefreshToken, clearTokens } from '@/lib/token-store';

describe('tokenStore', () => {
  describe('getAccessToken', () => {
    it('returns access token from cookies', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'access_token=abc123; path=/',
      });

      expect(getAccessToken()).toBe('abc123');
    });

    it('returns null when access token is missing', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'other_cookie=value; path=/',
      });

      expect(getAccessToken()).toBeNull();
    });

    it('handles URL-encoded values', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `access_token=${encodeURIComponent('token/with+special=chars')}; path=/`,
      });

      expect(getAccessToken()).toBe('token/with+special=chars');
    });

    it('handles multiple cookies', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'refresh_token=xyz789; access_token=abc123; other=value',
      });

      expect(getAccessToken()).toBe('abc123');
    });

    it('returns null on server (no document)', () => {
      const originalDocument = global.document;
      vi.stubGlobal('document', undefined);

      expect(getAccessToken()).toBeNull();

      vi.stubGlobal('document', originalDocument);
    });
  });

  describe('getRefreshToken', () => {
    it('returns refresh token from cookies', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'refresh_token=xyz789; path=/',
      });

      expect(getRefreshToken()).toBe('xyz789');
    });

    it('returns null when refresh token is missing', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'access_token=abc123; path=/',
      });

      expect(getRefreshToken()).toBeNull();
    });

    it('handles URL-encoded values', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `refresh_token=${encodeURIComponent('refresh/with+special')}; path=/`,
      });

      expect(getRefreshToken()).toBe('refresh/with+special');
    });

    it('returns null on server (no document)', () => {
      const originalDocument = global.document;
      vi.stubGlobal('document', undefined);

      expect(getRefreshToken()).toBeNull();

      vi.stubGlobal('document', originalDocument);
    });
  });

  describe('clearTokens', () => {
    it('does not throw on server (no document)', () => {
      const originalDocument = global.document;
      vi.stubGlobal('document', undefined);

      expect(() => clearTokens()).not.toThrow();

      vi.stubGlobal('document', originalDocument);
    });
  });
});
