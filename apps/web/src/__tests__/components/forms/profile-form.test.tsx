import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileForm } from '@/components/forms/profile-form';
import type { ProfileResponse } from '@repo/shared';

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: vi.fn(() => [null, vi.fn(), false]),
    useOptimistic: vi.fn((state) => [state, vi.fn()]),
  };
});

const mockProfile: ProfileResponse = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  role: 'user',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProfileForm', () => {
  it('renders name and image fields', () => {
    render(<ProfileForm initialProfile={mockProfile} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/image url/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<ProfileForm initialProfile={mockProfile} />);

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('displays current profile information', () => {
    render(<ProfileForm initialProfile={mockProfile} />);

    expect(screen.getByText(/test user/i)).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
  });

  it('shows save status indicator', () => {
    render(<ProfileForm initialProfile={mockProfile} />);

    expect(screen.getByText(/up to date/i)).toBeInTheDocument();
  });
});
