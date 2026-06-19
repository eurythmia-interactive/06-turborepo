import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginAction } from '@/actions/auth';

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

describe('loginAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation errors for invalid email', async () => {
    const formData = new FormData();
    formData.append('email', 'invalid');
    formData.append('password', 'password123');

    const result = await loginAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.email).toBeDefined();
  });

  it('returns validation errors for empty password', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', '');

    const result = await loginAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.password).toBeDefined();
  });

  it('calls API with correct credentials on valid input', async () => {
    mockPost.mockResolvedValue({
      accessToken: 'token',
      user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
      tenants: [],
    });

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const result = await loginAction(null, formData);

    expect(result.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('returns success with data on valid login', async () => {
    const mockResponse = {
      accessToken: 'valid-token',
      user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
      tenants: [{ id: 't1', name: 'Tenant', slug: 'tenant' }],
    };
    mockPost.mockResolvedValue(mockResponse);

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const result = await loginAction(null, formData);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('returns error message on 401', async () => {
    mockPost.mockRejectedValue(
      new ApiError(401, 'Unauthorized', { message: 'Invalid credentials' }),
    );

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'wrongpassword');

    const result = await loginAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid credentials');
  });

  it('returns default error message on 401 without message', async () => {
    mockPost.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'wrongpassword');

    const result = await loginAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid credentials');
  });

  it('returns network error message on fetch failure', async () => {
    mockPost.mockRejectedValue(new TypeError('Network error'));

    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const result = await loginAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unable to reach the server');
  });
});
