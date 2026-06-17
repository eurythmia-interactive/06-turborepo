import type { ProfileResponse } from '@repo/shared';

export async function getMockProfile(): Promise<ProfileResponse> {
  return {
    id: 'user-123',
    email: 'demo@example.com',
    name: 'Demo User',
    image: null,
    role: 'user',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
