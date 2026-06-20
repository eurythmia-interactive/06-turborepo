import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InvitationList } from '@/components/admin/invitation-list';

vi.mock('@/actions/invitations', () => ({
  getInvitationsAction: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [],
    }),
  ),
  resendInvitationAction: vi.fn(() => Promise.resolve({ success: true })),
  cancelInvitationAction: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InvitationList', () => {
  it('renders table headers', async () => {
    render(<InvitationList />);

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Expires')).toBeInTheDocument();
    });
  });

  it('shows empty state when no invitations', async () => {
    render(<InvitationList />);

    await waitFor(() => {
      expect(screen.getByText('No invitations found.')).toBeInTheDocument();
    });
  });

  it('renders invitation data', async () => {
    const { getInvitationsAction } = await import('@/actions/invitations');
    vi.mocked(getInvitationsAction).mockResolvedValueOnce({
      success: true,
      data: [
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
      ],
    });

    render(<InvitationList />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('member')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  it('renders filter dropdown', async () => {
    render(<InvitationList />);

    await waitFor(() => {
      expect(screen.getByText('Filter by status:')).toBeInTheDocument();
    });
  });
});
