import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startImpersonationAction,
  stopImpersonationAction,
  getImpersonationStatusAction,
} from '@/actions/impersonation';

vi.mock('@/lib/server-api-client', () => ({
  serverApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { serverApiClient } from '@/lib/server-api-client';

const mockGet = vi.mocked(serverApiClient.get);
const mockPost = vi.mocked(serverApiClient.post);

describe('Impersonation Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startImpersonationAction', () => {
    it('returns success with token data', async () => {
      const mockResponse = {
        accessToken: 'mock-token',
        expiresAt: '2026-12-31T23:59:59Z',
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await startImpersonationAction('user-123', 'Support request');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/impersonation/start', {
        userId: 'user-123',
        reason: 'Support request',
      });
    });

    it('returns error message on failure', async () => {
      mockPost.mockRejectedValue(new Error('Failed to start'));

      const result = await startImpersonationAction('user-123', 'Test');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to start');
    });
  });

  describe('stopImpersonationAction', () => {
    it('returns success when stopped', async () => {
      mockPost.mockResolvedValue({ success: true });

      const result = await stopImpersonationAction();

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/impersonation/stop');
    });

    it('returns error message on failure', async () => {
      mockPost.mockRejectedValue(new Error('Failed to stop'));

      const result = await stopImpersonationAction();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to stop');
    });
  });

  describe('getImpersonationStatusAction', () => {
    it('returns status data', async () => {
      const mockStatus = {
        isImpersonating: true,
        targetUser: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expiresAt: '2026-12-31T23:59:59Z',
      };

      mockGet.mockResolvedValue(mockStatus);

      const result = await getImpersonationStatusAction();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatus);
      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/impersonation/status');
    });

    it('returns not impersonating status', async () => {
      mockGet.mockResolvedValue({ isImpersonating: false });

      const result = await getImpersonationStatusAction();

      expect(result.success).toBe(true);
      expect(result.data?.isImpersonating).toBe(false);
    });

    it('returns error message on failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await getImpersonationStatusAction();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });
});
