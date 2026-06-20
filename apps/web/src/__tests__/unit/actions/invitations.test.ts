import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createInvitationAction,
  getInvitationsAction,
  resendInvitationAction,
  cancelInvitationAction,
  getInvitationByTokenAction,
  acceptInvitationAction,
} from '@/actions/invitations';

vi.mock('@/lib/server-api-client', () => ({
  serverApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { serverApiClient } from '@/lib/server-api-client';

const mockGet = vi.mocked(serverApiClient.get);
const mockPost = vi.mocked(serverApiClient.post);
const mockDelete = vi.mocked(serverApiClient.delete);

describe('Invitation Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvitationAction', () => {
    it('returns success with invitation data', async () => {
      const mockInvitation = {
        id: 'inv-123',
        email: 'user@example.com',
        tenantId: 'tenant-456',
        role: 'MEMBER',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-01-08T00:00:00Z',
        acceptedAt: null,
      };

      mockPost.mockResolvedValue(mockInvitation);

      const result = await createInvitationAction({
        email: 'user@example.com',
        tenantId: 'tenant-456',
        role: 'MEMBER',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvitation);
      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/invitations', {
        email: 'user@example.com',
        tenantId: 'tenant-456',
        role: 'MEMBER',
      });
    });

    it('validates email format', async () => {
      const result = await createInvitationAction({
        email: 'invalid-email',
        role: 'MEMBER',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('returns error message on failure', async () => {
      mockPost.mockRejectedValue(new Error('Failed to create'));

      const result = await createInvitationAction({
        email: 'user@example.com',
        role: 'MEMBER',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create');
    });
  });

  describe('getInvitationsAction', () => {
    it('returns list of invitations', async () => {
      const mockInvitations = [
        {
          id: 'inv-123',
          email: 'user@example.com',
          tenantId: 'tenant-456',
          role: 'MEMBER',
          status: 'pending',
          createdAt: '2026-01-01T00:00:00Z',
          expiresAt: '2026-01-08T00:00:00Z',
          acceptedAt: null,
        },
      ];

      mockGet.mockResolvedValue(mockInvitations);

      const result = await getInvitationsAction({ status: 'pending' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvitations);
      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/invitations?status=pending');
    });

    it('returns all invitations without filters', async () => {
      mockGet.mockResolvedValue([]);

      const result = await getInvitationsAction();

      expect(result.success).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/invitations');
    });

    it('returns error message on failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await getInvitationsAction();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  describe('resendInvitationAction', () => {
    it('returns success when resent', async () => {
      mockPost.mockResolvedValue({ success: true });

      const result = await resendInvitationAction('inv-123');

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/invitations/inv-123/resend');
    });

    it('returns error message on failure', async () => {
      mockPost.mockRejectedValue(new Error('Failed to resend'));

      const result = await resendInvitationAction('inv-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to resend');
    });
  });

  describe('cancelInvitationAction', () => {
    it('returns success when canceled', async () => {
      mockDelete.mockResolvedValue({ success: true });

      const result = await cancelInvitationAction('inv-123');

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith('/api/v1/admin/invitations/inv-123');
    });

    it('returns error message on failure', async () => {
      mockDelete.mockRejectedValue(new Error('Failed to cancel'));

      const result = await cancelInvitationAction('inv-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to cancel');
    });
  });

  describe('getInvitationByTokenAction', () => {
    it('returns invitation details', async () => {
      const mockInvitation = {
        email: 'user@example.com',
        tenantName: 'Test Tenant',
        role: 'MEMBER',
        expiresAt: '2026-01-08T00:00:00Z',
        status: 'pending',
      };

      mockGet.mockResolvedValue(mockInvitation);

      const result = await getInvitationByTokenAction('token-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvitation);
      expect(mockGet).toHaveBeenCalledWith('/api/v1/invitations/token-123');
    });

    it('returns error message on failure', async () => {
      mockGet.mockRejectedValue(new Error('Not found'));

      const result = await getInvitationByTokenAction('invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Not found');
    });
  });

  describe('acceptInvitationAction', () => {
    it('returns success when accepted', async () => {
      mockPost.mockResolvedValue({ success: true });

      const result = await acceptInvitationAction('token-123');

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/api/v1/invitations/token-123/accept');
    });

    it('returns error message on failure', async () => {
      mockPost.mockRejectedValue(new Error('Failed to accept'));

      const result = await acceptInvitationAction('token-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to accept');
    });
  });
});
