import { http, HttpResponse, delay } from 'msw';

const API_BASE = 'http://localhost:3001';

export const handlers = [
  http.post(`${API_BASE}/api/v1/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        accessToken: 'valid-access-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
        tenants: [{ id: 'tenant-1', name: 'Test Tenant', slug: 'test-tenant' }],
      });
    }

    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`${API_BASE}/api/v1/auth/register`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
      name?: string;
      confirmPassword: string;
    };

    if (body.email === 'taken@example.com') {
      return HttpResponse.json({ message: 'Email already registered' }, { status: 409 });
    }

    return HttpResponse.json({
      accessToken: 'valid-access-token',
      user: {
        id: 'user-456',
        email: body.email,
        name: body.name ?? null,
        role: 'user',
      },
      tenants: [{ id: 'tenant-1', name: 'Test Tenant', slug: 'test-tenant' }],
    });
  }),

  http.patch(`${API_BASE}/api/v1/auth/profile`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; image?: string };

    return HttpResponse.json({
      id: 'user-123',
      email: 'test@example.com',
      name: body.name ?? 'Test User',
      image: body.image ?? null,
      role: 'user',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE}/api/v1/auth/refresh`, async () => {
    return HttpResponse.json({
      accessToken: 'refreshed-access-token',
    });
  }),

  http.get(`${API_BASE}/api/v1/health`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];

export const delayedHandlers = [
  http.post(`${API_BASE}/api/v1/auth/login`, async () => {
    await delay(2000);
    return HttpResponse.json({
      accessToken: 'valid-access-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      },
      tenants: [],
    });
  }),
];

export const errorHandlers = [
  http.post(`${API_BASE}/api/v1/auth/login`, () => {
    return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
  }),

  http.patch(`${API_BASE}/api/v1/auth/profile`, () => {
    return HttpResponse.json({ message: 'Profile update failed' }, { status: 500 });
  }),
];

export const networkErrorHandlers = [
  http.post(`${API_BASE}/api/v1/auth/login`, () => {
    return HttpResponse.error();
  }),
];
