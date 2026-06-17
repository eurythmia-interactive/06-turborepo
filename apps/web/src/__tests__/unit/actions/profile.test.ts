import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProfileAction } from '@/actions/profile';

vi.mock('@/lib/server-api-client', () => ({
  serverApiClient: {
    patch: vi.fn(),
  },
}));

import { serverApiClient } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';

const mockPatch = vi.mocked(serverApiClient.patch);

describe('updateProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates name successfully', async () => {
    mockPatch.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      name: 'New Name',
      image: null,
      role: 'user',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const formData = new FormData();
    formData.append('name', 'New Name');

    const result = await updateProfileAction(null, formData);

    expect(result.success).toBe(true);
  });

  it('updates image URL successfully', async () => {
    mockPatch.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      role: 'user',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const formData = new FormData();
    formData.append('name', 'Test User');
    formData.append('image', 'https://example.com/avatar.jpg');

    const result = await updateProfileAction(null, formData);

    expect(result.success).toBe(true);
  });

  it('updates both name and image', async () => {
    mockPatch.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      name: 'New Name',
      image: 'https://example.com/avatar.jpg',
      role: 'user',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const formData = new FormData();
    formData.append('name', 'New Name');
    formData.append('image', 'https://example.com/avatar.jpg');

    const result = await updateProfileAction(null, formData);

    expect(result.success).toBe(true);
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/auth/profile', {
      name: 'New Name',
      image: 'https://example.com/avatar.jpg',
    });
  });

  it('returns validation errors for empty name', async () => {
    const formData = new FormData();
    formData.append('name', '');

    const result = await updateProfileAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.name).toBeDefined();
  });

  it('returns validation errors for invalid image URL', async () => {
    const formData = new FormData();
    formData.append('image', 'not-a-url');

    const result = await updateProfileAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.image).toBeDefined();
  });

  it('returns error message on API failure', async () => {
    mockPatch.mockRejectedValue(
      new ApiError(500, 'Internal Server Error', { message: 'Profile update failed' }),
    );

    const formData = new FormData();
    formData.append('name', 'New Name');

    const result = await updateProfileAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Profile update failed');
  });

  it('returns network error message on fetch failure', async () => {
    mockPatch.mockRejectedValue(new TypeError('Network error'));

    const formData = new FormData();
    formData.append('name', 'New Name');

    const result = await updateProfileAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Unable to reach the server. Please try again.');
  });
});
