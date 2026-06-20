import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ImpersonationBanner } from '@/components/admin/impersonation-banner';

vi.mock('@/actions/impersonation', () => ({
  getImpersonationStatusAction: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { isImpersonating: false },
    }),
  ),
  stopImpersonationAction: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ImpersonationBanner', () => {
  it('renders nothing when not impersonating', async () => {
    const { container } = render(<ImpersonationBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders banner with target user name when impersonating', async () => {
    const { getImpersonationStatusAction } = await import('@/actions/impersonation');
    vi.mocked(getImpersonationStatusAction).mockResolvedValueOnce({
      success: true,
      data: {
        isImpersonating: true,
        targetUser: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expiresAt: '2026-12-31T23:59:59Z',
      },
    });

    render(<ImpersonationBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Impersonating:/i)).toBeInTheDocument();
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });

  it('renders stop button', async () => {
    const { getImpersonationStatusAction } = await import('@/actions/impersonation');
    vi.mocked(getImpersonationStatusAction).mockResolvedValueOnce({
      success: true,
      data: {
        isImpersonating: true,
        targetUser: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expiresAt: '2026-12-31T23:59:59Z',
      },
    });

    render(<ImpersonationBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Stop/i)).toBeInTheDocument();
    });
  });
});
