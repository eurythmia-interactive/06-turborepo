import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerAction } from '@/actions/register';

vi.mock('@/lib/server-api-client', () => ({
  serverApiClient: {
    post: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: vi.fn(),
  })),
}));

import { serverApiClient } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';

const mockPost = vi.mocked(serverApiClient.post);

describe('registerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation errors for invalid email', async () => {
    const formData = new FormData();
    formData.append('email', 'invalid');
    formData.append('password', 'Password1!');
    formData.append('confirmPassword', 'Password1!');

    const result = await registerAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.email).toBeDefined();
  });

  it('returns validation errors for weak password', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'weak');
    formData.append('confirmPassword', 'weak');

    const result = await registerAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.password).toBeDefined();
  });

  it('returns validation errors for password mismatch', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'Password1!');
    formData.append('confirmPassword', 'Password2!');

    const result = await registerAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('calls API with correct data on valid input', async () => {
    mockPost.mockResolvedValue({
      accessToken: 'token',
      user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
      tenants: [],
    });

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('name', 'Test User');
    formData.append('password', 'Password1!');
    formData.append('confirmPassword', 'Password1!');

    const result = await registerAction(null, formData);

    expect(result.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/register', {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    });
  });

  it('handles optional name field', async () => {
    mockPost.mockResolvedValue({
      accessToken: 'token',
      user: { id: '1', email: 'test@example.com', name: null, role: 'user' },
      tenants: [],
    });

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('name', 'Test User');
    formData.append('password', 'Password1!');
    formData.append('confirmPassword', 'Password1!');

    const result = await registerAction(null, formData);

    expect(result.success).toBe(true);
  });

  it('returns error message on 409 conflict', async () => {
    mockPost.mockRejectedValue(
      new ApiError(409, 'Conflict', { message: 'Email already registered' }),
    );

    const formData = new FormData();
    formData.append('email', 'taken@example.com');
    formData.append('password', 'Password1!');
    formData.append('confirmPassword', 'Password1!');

    const result = await registerAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.success).toBe(false);
  });

  it('returns network error message on fetch failure', async () => {
    mockPost.mockRejectedValue(new TypeError('Network error'));

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'Password1!');
    formData.append('confirmPassword', 'Password1!');

    const result = await registerAction(null, formData);

    expect(result.success).toBe(false);
  });
});
