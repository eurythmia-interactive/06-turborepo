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

  // Maintenance endpoints
  http.get(`${API_BASE}/api/v1/admin/system/maintenance/status`, () => {
    return HttpResponse.json({
      enabled: false,
      message: null,
      scheduledEnd: null,
    });
  }),

  http.post(`${API_BASE}/api/v1/admin/system/maintenance/enable`, async ({ request }) => {
    const body = (await request.json()) as { message?: string; scheduledEnd?: string };
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/api/v1/admin/system/maintenance/disable`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Impersonation endpoints
  http.post(`${API_BASE}/api/v1/admin/impersonation/start`, async ({ request }) => {
    const body = (await request.json()) as { userId: string; reason: string };
    return HttpResponse.json({
      accessToken: 'impersonation-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  }),

  http.post(`${API_BASE}/api/v1/admin/impersonation/stop`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE}/api/v1/admin/impersonation/status`, () => {
    return HttpResponse.json({
      isImpersonating: false,
    });
  }),

  // Invitation endpoints
  http.post(`${API_BASE}/api/v1/admin/invitations`, async ({ request }) => {
    const body = (await request.json()) as { email: string; tenantId?: string; role: string };
    return HttpResponse.json({
      id: 'inv-123',
      email: body.email,
      tenantId: body.tenantId ?? null,
      role: body.role,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      acceptedAt: null,
    });
  }),

  http.get(`${API_BASE}/api/v1/admin/invitations`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`${API_BASE}/api/v1/admin/invitations/:id/resend`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.delete(`${API_BASE}/api/v1/admin/invitations/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE}/api/v1/invitations/:token`, ({ params }) => {
    return HttpResponse.json({
      email: 'user@example.com',
      tenantName: 'Test Tenant',
      role: 'MEMBER',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    });
  }),

  http.post(`${API_BASE}/api/v1/invitations/:token/accept`, () => {
    return HttpResponse.json({ success: true });
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
