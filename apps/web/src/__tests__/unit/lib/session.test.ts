import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSession, isAuthenticated } from '@/lib/session';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';

const mockCookies = vi.mocked(cookies);

describe('session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('returns null when access_token cookie is missing', async () => {
      mockCookies.mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const session = await getSession();

      expect(session).toBeNull();
    });

    it('returns session when access_token cookie exists', async () => {
      const mockGet = vi.fn((name: string) => {
        const cookieMap: Record<string, { name: string; value: string }> = {
          access_token: { name: 'access_token', value: 'test-token' },
          refresh_token: { name: 'refresh_token', value: 'refresh-token' },
          user_id: { name: 'user_id', value: 'user-123' },
          user_email: { name: 'user_email', value: 'test@example.com' },
          user_role: { name: 'user_role', value: 'admin' },
        };
        return cookieMap[name];
      });

      mockCookies.mockResolvedValue({
        get: mockGet,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const session = await getSession();

      expect(session).toEqual({
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      });
    });

    it('returns session with only required fields', async () => {
      const mockGet = vi.fn((name: string) => {
        if (name === 'access_token') {
          return { name: 'access_token', value: 'test-token' };
        }
        return undefined;
      });

      mockCookies.mockResolvedValue({
        get: mockGet,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const session = await getSession();

      expect(session).toEqual({
        accessToken: 'test-token',
        refreshToken: undefined,
        userId: undefined,
        email: undefined,
        role: undefined,
      });
    });

    it('handles partial session data', async () => {
      const mockGet = vi.fn((name: string) => {
        const cookieMap: Record<string, { name: string; value: string }> = {
          access_token: { name: 'access_token', value: 'test-token' },
          user_email: { name: 'user_email', value: 'test@example.com' },
        };
        return cookieMap[name];
      });

      mockCookies.mockResolvedValue({
        get: mockGet,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const session = await getSession();

      expect(session).toEqual({
        accessToken: 'test-token',
        refreshToken: undefined,
        userId: undefined,
        email: 'test@example.com',
        role: undefined,
      });
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no session exists', async () => {
      mockCookies.mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const authenticated = await isAuthenticated();

      expect(authenticated).toBe(false);
    });

    it('returns true when session exists', async () => {
      const mockGet = vi.fn((name: string) => {
        if (name === 'access_token') {
          return { name: 'access_token', value: 'test-token' };
        }
        return undefined;
      });

      mockCookies.mockResolvedValue({
        get: mockGet,
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const authenticated = await isAuthenticated();

      expect(authenticated).toBe(true);
    });
  });
});
