# Admin Dashboard MVP - Full Test Coverage Plan

**Status:** Ready for Execution  
**Estimated Time:** 2-3 hours

---

## Overview

The service layer has 27 unit tests. This plan adds ~15 test files covering middleware, controllers, email service, frontend server actions, frontend components, E2E tests, and MSW handlers.

---

## Execution Order

### Phase 1: Backend Unit Tests (3 files)

#### 1.1 Maintenance Middleware Test

**File:** `apps/api/src/admin/system/maintenance.middleware.spec.ts`  
**Pattern:** Same as service specs (manual instantiation with mocks)

**Tests:**

- Should call next() for `/health` path
- Should call next() for `/api/v1/admin/*` paths
- Should call next() for `/api/v1/auth/*` paths
- Should call next() for SUPER_ADMIN users
- Should return 503 when maintenance is active
- Should include maintenance message in 503 response
- Should include scheduledEnd in 503 response
- Should call next() when maintenance is disabled
- Should call next() when getStatus throws (graceful degradation)

#### 1.2 Email Service Test

**File:** `apps/api/src/common/email/email.service.spec.ts`  
**Pattern:** Same as service specs (manual instantiation with mocks)

**Tests:**

- Should log to console when RESEND_API_KEY not set
- Should send email via Resend when API key is set
- Should return true on successful send
- Should return false and log error on Resend failure
- Should call sendInvitation with correct template
- Should call sendWelcome with correct template

---

### Phase 2: Backend Controller Integration Tests (3 files)

**Pattern:** Follow `apps/api/test/health.controller.spec.ts` - NestJS TestingModule with mock providers

#### 2.1 Maintenance Controller Test

**File:** `apps/api/src/admin/system/maintenance.controller.spec.ts`

**Tests:**

- Should be defined
- Should enable maintenance mode and return success
- Should disable maintenance mode and return success
- Should return maintenance status
- Should pass userId from request.user to service
- Should pass ip and userAgent from request

#### 2.2 Impersonation Controller Test

**File:** `apps/api/src/admin/impersonation/impersonation.controller.spec.ts`

**Tests:**

- Should be defined
- Should start impersonation and return token
- Should stop impersonation and return success
- Should return impersonation status
- Should pass userId from request.user to service

#### 2.3 Invitation Controller Test

**File:** `apps/api/src/admin/invitation/invitation.controller.spec.ts`

**Tests:**

- Should be defined
- Should create invitation
- Should list invitations
- Should resend invitation
- Should cancel invitation
- Should pass userId from request.user to service

---

### Phase 3: Backend E2E Tests (3 files)

**Pattern:** Follow `apps/api/test/e2e/auth.e2e-spec.ts` - supertest with real test DB

#### 3.1 Maintenance E2E

**File:** `apps/api/test/e2e/maintenance.e2e-spec.ts`

**Setup:** Import AdminModule, SystemAdminModule, AuthModule. Create SUPER_ADMIN user, get access token.

**Tests:**

- `GET /admin/system/maintenance/status` returns disabled by default
- `POST /admin/system/maintenance/enable` enables maintenance
- `GET /admin/system/maintenance/status` returns enabled after enable
- `POST /admin/system/maintenance/disable` disables maintenance
- Should reject non-SUPER_ADMIN users (403)
- Should reject unauthenticated requests (401)

#### 3.2 Impersonation E2E

**File:** `apps/api/test/e2e/impersonation.e2e-spec.ts`

**Setup:** Create ADMIN user + MEMBER target user. Get access token.

**Tests:**

- `POST /admin/impersonation/start` returns access token
- `GET /admin/impersonation/status` returns impersonating state
- `POST /admin/impersonation/stop` returns success
- Should reject impersonating self (400)
- Should reject impersonating SUPER_ADMIN (403)
- Should reject unauthenticated requests (401)

#### 3.3 Invitation E2E

**File:** `apps/api/test/e2e/invitation.e2e-spec.ts`

**Setup:** Create ADMIN user + tenant. Get access token.

**Tests:**

- `POST /admin/invitations` creates invitation
- `GET /admin/invitations` lists invitations
- `POST /admin/invitations/:id/resend` resends invitation
- `DELETE /admin/invitations/:id` cancels invitation
- Should reject duplicate invitations (409)
- Should reject invitation for existing user (409)
- `GET /invitations/:token` returns invitation details (public)
- `POST /invitations/:token/accept` accepts invitation (authenticated)
- Should reject unauthenticated create (401)

**Fixtures needed:** Add `createTestInvitation()` to `apps/api/test/helpers/fixtures.ts`

---

### Phase 4: Frontend Server Action Tests (3 files)

**Pattern:** Follow `apps/web/src/__tests__/unit/actions/dashboard.test.ts` - vi.mock serverApiClient

#### 4.1 Maintenance Actions Test

**File:** `apps/web/src/__tests__/unit/actions/maintenance.test.ts`

**Tests:**

- `getMaintenanceStatusAction` returns success with status data
- `getMaintenanceStatusAction` returns error on failure
- `enableMaintenanceAction` returns success
- `enableMaintenanceAction` validates input with zod schema
- `enableMaintenanceAction` returns error on failure
- `disableMaintenanceAction` returns success
- `disableMaintenanceAction` returns error on failure

#### 4.2 Impersonation Actions Test

**File:** `apps/web/src/__tests__/unit/actions/impersonation.test.ts`

**Tests:**

- `startImpersonationAction` returns success with token
- `startImpersonationAction` sets access_token cookie
- `startImpersonationAction` returns error on failure
- `stopImpersonationAction` returns success
- `stopImpersonationAction` deletes access_token cookie
- `stopImpersonationAction` returns error on failure
- `getImpersonationStatusAction` returns status
- `getImpersonationStatusAction` returns error on failure

**Mock:** `vi.mock('next/headers', ...)` for cookies

#### 4.3 Invitation Actions Test

**File:** `apps/web/src/__tests__/unit/actions/invitations.test.ts`

**Tests:**

- `createInvitationAction` returns success
- `createInvitationAction` validates input
- `createInvitationAction` returns error on failure
- `getInvitationsAction` returns list
- `getInvitationsAction` includes query params
- `getInvitationsAction` returns error on failure
- `resendInvitationAction` returns success
- `resendInvitationAction` returns error on failure
- `cancelInvitationAction` returns success
- `cancelInvitationAction` returns error on failure
- `getInvitationByTokenAction` returns invitation details
- `getInvitationByTokenAction` returns error on failure
- `acceptInvitationAction` returns success
- `acceptInvitationAction` returns error on failure

---

### Phase 5: Frontend Component Tests (4 files)

**Pattern:** Follow `apps/web/src/__tests__/components/forms/login-form.test.tsx` - @testing-library/react

#### 5.1 Maintenance Toggle Test

**File:** `apps/web/src/__tests__/components/admin/maintenance-toggle.test.tsx`

**Tests:**

- Renders "Enable Maintenance" button when maintenance is disabled
- Renders warning alert when maintenance is enabled
- Shows disable button when maintenance is active
- Shows maintenance message in alert
- Shows scheduled end time when set

**Mock:** `vi.mock('@/actions/maintenance', ...)`

#### 5.2 Impersonation Banner Test

**File:** `apps/web/src/__tests__/components/admin/impersonation-banner.test.tsx`

**Tests:**

- Renders nothing when not impersonating
- Renders banner with target user name when impersonating
- Shows countdown timer
- Renders "Stop" button

**Mock:** `vi.mock('@/actions/impersonation', ...)`, `vi.mock('next/navigation', ...)`

#### 5.3 Invitation List Test

**File:** `apps/web/src/__tests__/components/admin/invitation-list.test.tsx`

**Tests:**

- Renders table with invitation data
- Shows "No invitations found" when empty
- Renders status badges correctly
- Shows filter dropdown

**Mock:** `vi.mock('@/actions/invitations', ...)`

#### 5.4 Invitation Dialog Test

**File:** `apps/web/src/__tests__/components/admin/invitation-dialog.test.tsx`

**Tests:**

- Renders email input field
- Renders role select dropdown
- Renders submit button
- Renders cancel button

**Mock:** `vi.mock('@/actions/invitations', ...)`

---

### Phase 6: MSW Handlers

**File:** `apps/web/src/mocks/handlers.ts` (modify existing)

**Add handlers for:**

- `GET /api/v1/admin/system/maintenance/status`
- `POST /api/v1/admin/system/maintenance/enable`
- `POST /api/v1/admin/system/maintenance/disable`
- `POST /api/v1/admin/impersonation/start`
- `POST /api/v1/admin/impersonation/stop`
- `GET /api/v1/admin/impersonation/status`
- `POST /api/v1/admin/invitations`
- `GET /api/v1/admin/invitations`
- `POST /api/v1/admin/invitations/:id/resend`
- `DELETE /api/v1/admin/invitations/:id`
- `GET /api/v1/invitations/:token`
- `POST /api/v1/invitations/:token/accept`

---

## Test Fixtures Update

**File:** `apps/api/test/helpers/fixtures.ts`

Add:

```typescript
export async function createTestInvitation(prisma, options = {}) {
  // Creates UserInvitation with token, email, tenantId, role, invitedBy, expiresAt
}
```

**File:** `apps/api/test/helpers/test-db.ts`

Add to `cleanTestDatabase()`:

```typescript
await prisma.userInvitation.deleteMany();
await prisma.systemConfig.deleteMany();
```

---

## Files Summary

| Phase                  | Files to Create | Files to Modify       |
| ---------------------- | --------------- | --------------------- |
| 1. Backend Unit        | 2               | 0                     |
| 2. Backend Controller  | 3               | 0                     |
| 3. Backend E2E         | 3               | 2 (fixtures, test-db) |
| 4. Frontend Actions    | 3               | 0                     |
| 5. Frontend Components | 4               | 0                     |
| 6. MSW Handlers        | 0               | 1                     |
| **Total**              | **15**          | **3**                 |

**Estimated new tests:** ~100-120 test cases

---

## Verification

After all tests are written:

```bash
pnpm --filter api test    # All API tests pass
pnpm --filter web test    # All web tests pass
pnpm build                # All packages build
```
