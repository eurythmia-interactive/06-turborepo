import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvitationDialog } from '@/components/admin/invitation-dialog';

vi.mock('@/actions/invitations', () => ({
  createInvitationAction: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InvitationDialog', () => {
  it('renders email input field', () => {
    render(<InvitationDialog open={true} onOpenChange={() => {}} onSuccess={() => {}} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders role select dropdown', () => {
    render(<InvitationDialog open={true} onOpenChange={() => {}} onSuccess={() => {}} />);

    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<InvitationDialog open={true} onOpenChange={() => {}} onSuccess={() => {}} />);

    expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    render(<InvitationDialog open={true} onOpenChange={() => {}} onSuccess={() => {}} />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders dialog title and description', () => {
    render(<InvitationDialog open={true} onOpenChange={() => {}} onSuccess={() => {}} />);

    expect(screen.getByText('Invite User')).toBeInTheDocument();
    expect(screen.getByText(/Send an invitation email/i)).toBeInTheDocument();
  });
});
