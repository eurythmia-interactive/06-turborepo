# Chapter 6 Test Plan

**Scope:** Next.js 16 Dashboard Client (`apps/web`)  
**Date:** 2026-06-17  
**Status:** Draft

---

## Testing Philosophy

Focus on **user behavior and business logic**, not implementation details. Test what matters:

- Forms validate correctly and provide accessible feedback
- Auth flows work end-to-end (login → redirect → protected routes)
- API client handles token refresh transparently
- Components render correctly in different states

**Coverage Target:** 80% for business logic, 60% for UI components

---

## Test Stack

| Tool                          | Purpose              | Why                                     |
| ----------------------------- | -------------------- | --------------------------------------- |
| **Vitest**                    | Unit tests           | Fast, native ESM, works with Turbopack  |
| **React Testing Library**     | Component tests      | Tests user behavior, not implementation |
| **MSW (Mock Service Worker)** | API mocking          | Intercepts fetch at network level       |
| **Playwright**                | E2E tests (optional) | Real browser testing for critical flows |

---

## Test Structure

```
apps/web/
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.test.ts
│   │   │   │   ├── token-store.test.ts
│   │   │   │   ├── request-queue.test.ts
│   │   │   │   └── session.test.ts
│   │   │   └── actions/
│   │   │       ├── auth.test.ts
│   │   │       ├── register.test.ts
│   │   │       └── profile.test.ts
│   │   ├── components/
│   │   │   ├── forms/
│   │   │   │   ├── login-form.test.tsx
│   │   │   │   ├── register-form.test.tsx
│   │   │   │   └── profile-form.test.tsx
│   │   │   ├── layout/
│   │   │   │   ├── dashboard-layout.test.tsx
│   │   │   │   └── page-header.test.tsx
│   │   │   └── ui/
│   │   │       ├── theme-toggle.test.tsx
│   │   │       └── view-transition-link.test.tsx
│   │   └── integration/
│   │       ├── auth-flow.test.tsx
│   │       └── profile-update-flow.test.tsx
│   └── mocks/
│       ├── handlers.ts
│       └── server.ts
└── vitest.config.ts
```

---

## Test Categories

### 1. Unit Tests - Core Logic

#### API Client (`lib/api-client.test.ts`)

**What to test:**

- Request timeout handling (30s default)
- JSON serialization/deserialization
- Error handling (network errors, HTTP errors)
- Credentials inclusion
- Custom headers

**Example:**

```typescript
describe('ApiClient', () => {
  it('throws TimeoutError when request exceeds timeout', async () => {
    const client = new ApiClient({ baseURL: 'http://api.test', timeout: 100 });

    // Mock delayed response
    vi.spyOn(global, 'fetch').mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );

    await expect(client.get('/test')).rejects.toThrow(TimeoutError);
  });

  it('includes credentials in requests', async () => {
    const client = new ApiClient({ baseURL: 'http://api.test' });
    const fetchSpy = vi.spyOn(global, 'fetch');

    await client.get('/test');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
```

#### Token Store (`lib/token-store.test.ts`)

**What to test:**

- Cookie parsing (access_token, refresh_token)
- Token retrieval
- Token clearing
- SSR safety (returns null on server)

**Example:**

```typescript
describe('tokenStore', () => {
  beforeEach(() => {
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'access_token=abc123; refresh_token=xyz789',
    });
  });

  it('retrieves access token from cookies', () => {
    expect(getAccessToken()).toBe('abc123');
  });

  it('returns null on server', () => {
    vi.stubGlobal('document', undefined);
    expect(getAccessToken()).toBeNull();
  });
});
```

#### Request Queue (`lib/request-queue.test.ts`)

**What to test:**

- Concurrent requests are queued
- Single refresh call for multiple 401s
- Queue resolution after refresh
- Error propagation

**Example:**

```typescript
describe('RequestQueue', () => {
  it('queues concurrent requests during refresh', async () => {
    const queue = new RequestQueue();
    const refreshFn = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(true), 100)));

    // Start 3 concurrent requests
    const promises = [
      queue.waitForRefresh(refreshFn),
      queue.waitForRefresh(refreshFn),
      queue.waitForRefresh(refreshFn),
    ];

    await Promise.all(promises);

    // Refresh should only be called once
    expect(refreshFn).toHaveBeenCalledTimes(1);
  });
});
```

#### Session (`lib/session.test.ts`)

**What to test:**

- Cookie parsing (all session fields)
- Null handling (missing cookies)
- isAuthenticated helper

---

### 2. Unit Tests - Server Actions

#### Auth Action (`actions/auth.test.ts`)

**What to test:**

- Schema validation (email format, password required)
- API call with correct payload
- Success response handling
- Error response handling (401, network error)
- FormData parsing

**Example:**

```typescript
describe('loginAction', () => {
  it('returns validation errors for invalid email', async () => {
    const formData = new FormData();
    formData.append('email', 'invalid');
    formData.append('password', 'password123');

    const result = await loginAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.email).toBeDefined();
  });

  it('calls API with correct credentials', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'token', user: {...} }), { status: 200 })
    );

    await loginAction(null, formData);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      })
    );
  });
});
```

#### Register Action (`actions/register.test.ts`)

**What to test:**

- Password strength validation (8+ chars, mixed case, digits, special chars)
- Password confirmation match
- Optional name field
- API error handling

#### Profile Action (`actions/profile.test.ts`)

**What to test:**

- Partial updates (name only, image only, both)
- URL validation for image field
- PATCH request format

---

### 3. Component Tests - Forms

#### Login Form (`components/forms/login-form.test.tsx`)

**What to test:**

- Renders email and password fields
- Shows validation errors on submit
- Displays server error messages
- Disables inputs during submission (isPending)
- Submits form with correct data
- Shows loading state ("Signing in...")
- Links to register page

**Example:**

```typescript
describe('LoginForm', () => {
  it('shows validation errors for empty fields', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('displays server error message', async () => {
    // Mock failed login
    server.use(
      rest.post('/api/v1/auth/login', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ message: 'Invalid credentials' }));
      })
    );

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('disables form during submission', async () => {
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
  });
});
```

#### Register Form (`components/forms/register-form.test.tsx`)

**What to test:**

- All fields render (email, name, password, confirmPassword)
- Password strength validation messages
- Password match validation
- Optional name field handling
- Success redirect behavior

#### Profile Form (`components/forms/profile-form.test.tsx`)

**What to test:**

- Pre-fills with initial profile data
- Shows optimistic updates immediately
- Rolls back on error
- Save status indicator (idle/saving/saved/error)
- Partial update submission

**Example:**

```typescript
describe('ProfileForm', () => {
  it('shows optimistic update immediately', async () => {
    const initialProfile = { id: '1', name: 'Old Name', email: 'test@example.com', ... };
    render(<ProfileForm initialProfile={initialProfile} />);

    // Mock slow API response
    server.use(
      rest.patch('/api/v1/auth/profile', (req, res, ctx) => {
        return res(ctx.delay(1000), ctx.json({ ...initialProfile, name: 'New Name' }));
      })
    );

    await userEvent.clear(screen.getByLabelText(/name/i));
    await userEvent.type(screen.getByLabelText(/name/i), 'New Name');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // Should show new name immediately (optimistic)
    expect(screen.getByText(/new name/i)).toBeInTheDocument();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('rolls back on error', async () => {
    const initialProfile = { id: '1', name: 'Old Name', ... };
    render(<ProfileForm initialProfile={initialProfile} />);

    server.use(
      rest.patch('/api/v1/auth/profile', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'Server error' }));
      })
    );

    await userEvent.clear(screen.getByLabelText(/name/i));
    await userEvent.type(screen.getByLabelText(/name/i), 'New Name');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // Should roll back to old name
    expect(await screen.findByText(/old name/i)).toBeInTheDocument();
    expect(screen.getByText(/error saving/i)).toBeInTheDocument();
  });
});
```

---

### 4. Component Tests - Layout & UI

#### Dashboard Layout (`components/layout/dashboard-layout.test.tsx`)

**What to test:**

- Renders sidebar with navigation links
- Sidebar toggle works
- Theme toggle is visible
- Children render correctly
- Responsive behavior (mobile/desktop)

#### Theme Toggle (`components/theme-toggle.test.tsx`)

**What to test:**

- Cycles through themes (light → dark → system)
- Updates document class
- Persists theme preference
- Icons change based on theme

#### View Transition Link (`components/ViewTransitionLink.test.tsx`)

**What to test:**

- Renders as anchor tag
- Triggers view transition on click (if supported)
- Falls back to normal navigation
- Shows loading state during transition

#### Page Header (`components/layout/page-header.test.tsx`)

**What to test:**

- Renders title and description
- Renders action buttons/children
- Responsive layout (stacked on mobile, row on desktop)

---

### 5. Integration Tests

#### Auth Flow (`integration/auth-flow.test.tsx`)

**What to test:**

- Complete login flow (form → API → redirect → protected route)
- Token storage in cookies
- Session validation on protected routes
- Logout behavior

**Example:**

```typescript
describe('Auth Flow', () => {
  it('logs in and redirects to dashboard', async () => {
    // Mock login API
    server.use(
      rest.post('/api/v1/auth/login', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.cookie('access_token', 'valid-token'),
          ctx.json({ accessToken: 'valid-token', user: {...} })
        );
      })
    );

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Should redirect to dashboard
    expect(await screen.findByText(/dashboard/i)).toBeInTheDocument();
  });

  it('redirects to login when accessing protected route', async () => {
    // No access_token cookie
    render(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});
```

#### Profile Update Flow (`integration/profile-update-flow.test.tsx`)

**What to test:**

- Load profile data
- Edit fields
- Optimistic update
- API call
- Success/error handling
- UI feedback

---

### 6. E2E Tests (Optional - Playwright)

**Critical paths to test:**

- Login → Dashboard navigation
- Registration flow
- Profile update with optimistic UI
- Theme switching persistence
- Route protection (unauthenticated access)

**Example:**

```typescript
test('complete login flow', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});

test('protected route redirects to login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL('/login');
});
```

---

## Mocking Strategy

### MSW Setup

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/v1/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;

    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          accessToken: 'valid-token',
          user: { id: '1', email, name: 'Test User', role: 'user' },
        }),
      );
    }

    return res(ctx.status(401), ctx.json({ message: 'Invalid credentials' }));
  }),

  // Add more handlers...
];

// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Test Setup

```typescript
// vitest.setup.ts
import { server } from './src/mocks/server';
import '@testing-library/jest-dom';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## What NOT to Test

Avoid testing:

- Implementation details (useState, useEffect internals)
- Third-party library behavior (shadcn components, react-hook-form internals)
- Styling (Tailwind classes, CSS)
- Static content (unless business-critical)

---

## CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Run tests
  run: pnpm test
  working-directory: apps/web

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: apps/web/coverage/lcov.info
```

---

## Test Execution

```bash
# Run all tests
pnpm --filter @apps/web test

# Run specific test file
pnpm --filter @apps/web test login-form.test.tsx

# Run with coverage
pnpm --filter @apps/web test --coverage

# Watch mode
pnpm --filter @apps/web test:watch
```

---

## Priority Order

**Phase 1 - Critical (Week 1):**

1. Form validation tests (login, register, profile)
2. Auth flow integration tests
3. API client unit tests

**Phase 2 - Important (Week 2):** 4. Server action tests 5. Component tests (layout, theme toggle) 6. Token management tests

**Phase 3 - Nice to Have (Week 3):** 7. E2E tests (Playwright) 8. Edge cases and error scenarios 9. Accessibility tests

---

## Success Criteria

- All critical user flows have tests
- 80% coverage on business logic (actions, API client)
- 60% coverage on components
- Tests run in < 30 seconds
- CI passes on every PR
- No flaky tests

---

## Next Steps

1. Install test dependencies:

   ```bash
   pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw jsdom
   ```

2. Create `vitest.config.ts` and `vitest.setup.ts`

3. Start with Phase 1 tests (forms + auth flow)

4. Add tests incrementally as you build features

5. Set up CI integration
