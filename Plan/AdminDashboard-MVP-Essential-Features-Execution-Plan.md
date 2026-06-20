# MVP Essential Features - Execution Plan

**Date:** January 2026  
**Status:** Ready for Execution  
**Estimated Time:** 12-15 hours

---

## Executive Summary

This plan implements the final essential features for the admin dashboard MVP. Based on a thorough analysis of the existing codebase, we've identified that **~40% of the planned work is already complete** from previous phases. This document focuses only on what remains to be built.

**Features to Implement:**
1. Security hardening (helmet)
2. Maintenance mode
3. User impersonation
4. Email service (Resend)
5. User invitations

**Features Already Complete (DO NOT REBUILD):**
- Bulk operations (suspend/activate/delete/role-assign)
- Query optimization (indexes, caching)
- Security basics (guards, rate limiting, CORS)
- Seed data (superadmin/admin/member users)
- CI/CD (deferred per decision)

---

## Current State Analysis

### What Already Exists

**Infrastructure:**
- ✅ Monorepo with Turborepo (apps/api, apps/web, packages/database, packages/shared)
- ✅ PostgreSQL database with Prisma ORM
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (SUPER_ADMIN, ADMIN, MEMBER, GUEST)
- ✅ Permission system with granular permissions
- ✅ Rate limiting (global + admin-specific)
- ✅ CORS configuration
- ✅ Zod validation on all endpoints
- ✅ Audit logging system
- ✅ Dashboard with metrics and charts
- ✅ Audit log viewer with filtering and export
- ✅ Session management (list, revoke)

**Database Models:**
- ✅ User, Tenant, UserTenant (with roles)
- ✅ CustomRole with permissions array
- ✅ RefreshToken (sessions) with ip/userAgent fields
- ✅ AuditLog with indexes
- ✅ SystemConfig (key-value store)
- ✅ UserInvitation (model exists, not yet used)
- ✅ FeatureFlag (model exists, not yet used)

**Admin Features:**
- ✅ Tenant management (CRUD, suspend/restore)
- ✅ User management (CRUD, suspend/activate, password reset)
- ✅ Role management (CRUD, permission assignment)
- ✅ Bulk operations (suspend/activate/delete/role-assign)
- ✅ Dashboard with real-time metrics
- ✅ Audit logs (view, filter, export CSV/JSON)
- ✅ Session management (view, revoke)
- ✅ Quick actions widget

**Test Coverage:**
- ✅ 262 API tests passing
- ✅ 98 web tests passing
- ✅ 27 shared package tests passing

### What Needs to Be Built

| Feature | Status | Dependencies |
|---------|--------|--------------|
| Security headers (helmet) | Not started | None |
| Maintenance mode | Not started | SystemConfig exists |
| User impersonation | Not started | Permission constant exists |
| Email service | Not started | None |
| User invitations | Not started | UserInvitation model exists, needs email service |

---

## Execution Plan

### Step 1: Security Hardening (15 minutes)

**Objective:** Add security headers to all HTTP responses

**Actions:**
1. Install helmet:
   ```bash
   pnpm add helmet --filter api
   pnpm add -D @types/helmet --filter api
   ```

2. Update `apps/api/src/main.ts`:
   - Import helmet
   - Apply helmet middleware before other middleware
   - Configure CSP to allow admin dashboard resources

3. Verify headers in response (X-Frame-Options, X-Content-Type-Options, etc.)

**Files to Modify:**
- `apps/api/src/main.ts`

**Verification:**
- [ ] Helmet installed
- [ ] Security headers present in responses
- [ ] Admin dashboard still works

---

### Step 2: Maintenance Mode (2-3 hours)

**Objective:** Allow admins to put the system in maintenance mode, blocking non-admin access

**Backend Implementation:**

1. **Create MaintenanceService** (`apps/api/src/admin/system/maintenance.service.ts`):
   - Use `SystemConfig` table with key `maintenance_mode`
   - Methods:
     - `enable(message: string, scheduledEnd?: Date)` - Set maintenance mode
     - `disable()` - Clear maintenance mode
     - `getStatus()` - Return { enabled, message, scheduledEnd }
     - `isActive()` - Quick boolean check
   - Cache status in memory (invalidate on changes)
   - Log to audit: `system.maintenance_on`, `system.maintenance_off`

2. **Create MaintenanceController** (`apps/api/src/admin/system/maintenance.controller.ts`):
   - `POST /admin/system/maintenance/enable` - Enable maintenance
   - `POST /admin/system/maintenance/disable` - Disable maintenance
   - `GET /admin/system/maintenance/status` - Get status
   - Guards: JwtAuthGuard, RolesGuard, PermissionsGuard
   - Permission: `system:maintenance` (only SUPER_ADMIN)

3. **Create MaintenanceMiddleware** (`apps/api/src/admin/system/maintenance.middleware.ts`):
   - Check if maintenance mode is active
   - Allow bypass for:
     - SUPER_ADMIN users
     - `/admin/*` routes (admin dashboard)
     - `/health` endpoint
   - Return 503 with maintenance message for others

4. **Wire up MaintenanceModule** (`apps/api/src/admin/system/maintenance.module.ts`):
   - Import AdminModule (for AuditService)
   - Register controller, service, middleware
   - Export service

**Frontend Implementation:**

5. **Create MaintenanceToggle** (`apps/web/src/components/admin/maintenance-toggle.tsx`):
   - Button to enable/disable maintenance mode
   - Show current status
   - Dialog to set message and scheduled end time
   - Only visible to SUPER_ADMIN

6. **Create MaintenancePage** (`apps/web/src/app/maintenance/page.tsx`):
   - Public page shown when maintenance is active
   - Display maintenance message
   - Show scheduled end time if set
   - Admin bypass button (checks session, redirects to /admin)

7. **Add to Admin Dashboard**:
   - Add maintenance toggle to quick actions or system settings
   - Show warning banner when maintenance is active

**Shared Schemas:**

8. **Update shared schemas** (`packages/shared/src/admin/system.schema.ts`):
   - `maintenanceStatusSchema` - { enabled, message, scheduledEnd }
   - `enableMaintenanceSchema` - { message, scheduledEnd? }
   - Export types

**Files to Create:**
- `apps/api/src/admin/system/maintenance.service.ts`
- `apps/api/src/admin/system/maintenance.controller.ts`
- `apps/api/src/admin/system/maintenance.middleware.ts`
- `apps/api/src/admin/system/maintenance.module.ts`
- `apps/web/src/components/admin/maintenance-toggle.tsx`
- `apps/web/src/app/maintenance/page.tsx`

**Files to Modify:**
- `apps/api/src/admin/system/system-admin.module.ts` (replace empty module)
- `apps/api/src/admin/admin.module.ts` (import MaintenanceModule)
- `apps/api/src/app.module.ts` (apply MaintenanceMiddleware globally)
- `packages/shared/src/admin/system.schema.ts` (add schemas)
- `packages/shared/src/index.ts` (export schemas)

**Verification:**
- [ ] Maintenance can be enabled/disabled
- [ ] Non-admin users get 503 when maintenance is active
- [ ] Admin users can still access /admin
- [ ] /health endpoint still works
- [ ] Maintenance page shows message
- [ ] Audit logs capture maintenance events
- [ ] Status endpoint returns correct state

---

### Step 3: User Impersonation (3-4 hours)

**Objective:** Allow admins to impersonate users for debugging/support

**Backend Implementation:**

1. **Update Permission** (`packages/shared/src/admin/permissions.ts`):
   - Add `user:impersonate` to ADMIN role permissions array
   - Currently only SUPER_ADMIN has it via AllPermissions

2. **Create ImpersonationService** (`apps/api/src/admin/impersonation/impersonation.service.ts`):
   - Methods:
     - `startImpersonation(adminUserId, targetUserId, reason)` - Generate impersonation token
     - `stopImpersonation(adminUserId)` - Revoke impersonation token
     - `isImpersonating(userId)` - Check if user is being impersonated
   - Token structure:
     - `sub`: targetUserId
     - `impersonatedBy`: adminUserId
     - `isImpersonation`: true
     - `reason`: string
     - Expiry: 1 hour max
   - Store active impersonations in memory (Map<adminUserId, { targetUserId, expiresAt }>)
   - Log to audit: `user.impersonation_started`, `user.impersonation_stopped`
   - Validation:
     - Cannot impersonate SUPER_ADMIN
     - Cannot impersonate self
     - Cannot impersonate if already impersonating

3. **Create ImpersonationController** (`apps/api/src/admin/impersonation/impersonation.controller.ts`):
   - `POST /admin/impersonation/start` - Start impersonation
     - Body: { userId, reason }
     - Returns: { accessToken, expiresAt }
   - `POST /admin/impersonation/stop` - Stop impersonation
     - Returns: { success: true }
   - `GET /admin/impersonation/status` - Check if currently impersonating
     - Returns: { isImpersonating, targetUser?, expiresAt? }
   - Guards: JwtAuthGuard, RolesGuard, PermissionsGuard
   - Permission: `user:impersonate`

4. **Update JwtAuthGuard** (`apps/api/src/auth/guards/jwt-auth.guard.ts`):
   - Check for `isImpersonation` flag in token
   - If impersonating:
     - Set `req.user.impersonatedBy` from token
     - Set `req.user.isImpersonating = true`
   - Allow normal flow otherwise

5. **Create ImpersonationModule** (`apps/api/src/admin/impersonation/impersonation.module.ts`):
   - Import AdminModule (for AuditService)
   - Import AuthModule (for TokenPayloadFactory)
   - Register controller and service
   - Export service

**Frontend Implementation:**

6. **Create ImpersonateButton** (`apps/web/src/components/admin/impersonate-button.tsx`):
   - Add to user actions dropdown
   - Only show if user has `user:impersonate` permission
   - Only show for non-admin users
   - Open confirmation dialog with reason input
   - Call start impersonation endpoint
   - Store new token in cookie
   - Redirect to /dashboard (user's dashboard)

7. **Create ImpersonationBanner** (`apps/web/src/components/admin/impersonation-banner.tsx`):
   - Show at top of page when impersonating
   - Display: "Impersonating [user name] - [expires in X minutes]"
   - "Stop Impersonation" button
   - Red/orange background for visibility
   - Check impersonation status on mount
   - Auto-redirect to /admin when stopped

8. **Create Server Actions** (`apps/web/src/actions/impersonation.ts`):
   - `startImpersonationAction(userId, reason)`
   - `stopImpersonationAction()`
   - `getImpersonationStatusAction()`

9. **Update Layout**:
   - Add ImpersonationBanner to `apps/web/src/app/(dashboard)/layout.tsx`
   - Add ImpersonationBanner to `apps/web/src/app/admin/layout.tsx` (for testing)

**Files to Create:**
- `apps/api/src/admin/impersonation/impersonation.service.ts`
- `apps/api/src/admin/impersonation/impersonation.controller.ts`
- `apps/api/src/admin/impersonation/impersonation.module.ts`
- `apps/web/src/components/admin/impersonate-button.tsx`
- `apps/web/src/components/admin/impersonation-banner.tsx`
- `apps/web/src/actions/impersonation.ts`

**Files to Modify:**
- `packages/shared/src/admin/permissions.ts` (add to ADMIN role)
- `apps/api/src/auth/guards/jwt-auth.guard.ts` (handle impersonation tokens)
- `apps/api/src/admin/admin.module.ts` (import ImpersonationModule)
- `apps/web/src/app/(dashboard)/layout.tsx` (add banner)
- `apps/web/src/app/admin/layout.tsx` (add banner)
- `apps/web/src/components/admin/user-actions.tsx` (add impersonate option)

**Verification:**
- [ ] Admin can start impersonation
- [ ] Token is generated with correct claims
- [ ] Admin can access app as target user
- [ ] Banner shows when impersonating
- [ ] Admin can stop impersonation
- [ ] Token expires after 1 hour
- [ ] Cannot impersonate SUPER_ADMIN
- [ ] Cannot impersonate self
- [ ] Audit logs capture impersonation events
- [ ] Permission check works (only ADMIN and SUPER_ADMIN)

---

### Step 4: Email Service with Resend (1 hour)

**Objective:** Set up email infrastructure for sending invitations

**Setup:**

1. **Install Resend:**
   ```bash
   pnpm add resend --filter api
   ```

2. **Update Environment Validation** (`apps/api/src/config/env.validation.ts`):
   - Add `RESEND_API_KEY` (optional for now, required for invitations)
   - Add `EMAIL_FROM` (default: "noreply@example.com")

3. **Update .env.example:**
   ```env
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@example.com
   ```

4. **Create EmailService** (`apps/api/src/common/email/email.service.ts`):
   - Initialize Resend client with API key
   - Methods:
     - `send(to, subject, html)` - Send email
     - `sendInvitation(to, invitationLink, tenantName, inviterName)` - Send invitation
     - `sendWelcome(to, userName)` - Send welcome email
   - Error handling:
     - Log errors but don't throw (email failures shouldn't break flows)
     - Return success/failure boolean
   - In development: log emails to console if RESEND_API_KEY not set

5. **Create EmailModule** (`apps/api/src/common/email/email.module.ts`):
   - Global module
   - Export EmailService

6. **Create Email Templates** (`apps/api/src/common/email/templates/`):
   - `invitation.tsx` - Invitation email template
   - `welcome.tsx` - Welcome email template
   - Use simple HTML with inline styles
   - Include tenant branding if available

**Files to Create:**
- `apps/api/src/common/email/email.service.ts`
- `apps/api/src/common/email/email.module.ts`
- `apps/api/src/common/email/templates/invitation.tsx`
- `apps/api/src/common/email/templates/welcome.tsx`

**Files to Modify:**
- `apps/api/src/config/env.validation.ts` (add RESEND_API_KEY, EMAIL_FROM)
- `apps/api/src/app.module.ts` (import EmailModule)
- `.env.example` (add RESEND_API_KEY, EMAIL_FROM)

**Verification:**
- [ ] Resend installed
- [ ] EmailService can send test email
- [ ] Templates render correctly
- [ ] Email failures are logged but don't crash
- [ ] Works in dev mode without API key (console logging)

---

### Step 5: User Invitations (3-4 hours)

**Objective:** Allow admins to invite users to tenants via email

**Backend Implementation:**

1. **Create InvitationService** (`apps/api/src/admin/invitation/invitation.service.ts`):
   - Methods:
     - `createInvitation(email, tenantId, role, invitedBy)` - Create and send invitation
       - Check if user already exists (return conflict)
       - Check if invitation already pending (return conflict)
       - Generate secure token (crypto.randomBytes(32).toString('hex'))
       - Set expiry: 7 days
       - Store in UserInvitation table
       - Send invitation email via EmailService
       - Log to audit: `invitation.created`
     - `acceptInvitation(token, userId)` - Accept invitation
       - Validate token exists and not expired
       - Check not already accepted
       - Create UserTenant record
       - Mark invitation as accepted
       - Log to audit: `invitation.accepted`
     - `getInvitations(tenantId?, status?)` - List invitations
     - `resendInvitation(invitationId)` - Resend invitation email
     - `cancelInvitation(invitationId)` - Cancel pending invitation

2. **Create InvitationController** (`apps/api/src/admin/invitation/invitation.controller.ts`):
   - `POST /admin/invitations` - Create invitation
     - Body: { email, tenantId, role }
     - Permission: `user:write`
   - `GET /admin/invitations` - List invitations
     - Query: { tenantId?, status? }
     - Permission: `user:read`
   - `POST /admin/invitations/:id/resend` - Resend invitation
     - Permission: `user:write`
   - `DELETE /admin/invitations/:id` - Cancel invitation
     - Permission: `user:write`

3. **Create Public InvitationController** (`apps/api/src/invitation/invitation.controller.ts`):
   - `GET /invitations/:token` - Get invitation details (public)
     - Returns: { email, tenantName, role, expiresAt }
   - `POST /invitations/:token/accept` - Accept invitation (public)
     - Body: { userId } (from authenticated session)
     - Returns: { success: true }
   - No auth guards (public endpoints)

4. **Create InvitationModule** (`apps/api/src/admin/invitation/invitation.module.ts`):
   - Import AdminModule (for AuditService)
   - Import EmailModule
   - Register controller and service
   - Export service

5. **Create Public InvitationModule** (`apps/api/src/invitation/invitation.module.ts`):
   - Import AdminModule (for InvitationService)
   - Register public controller

**Frontend Implementation:**

6. **Create InvitationDialog** (`apps/web/src/components/admin/invitation-dialog.tsx`):
   - Form fields: email, tenant (dropdown), role (dropdown)
   - Validation: email format, required fields
   - Submit calls createInvitationAction
   - Show success/error toast
   - Reset form on success

7. **Create InvitationList** (`apps/web/src/components/admin/invitation-list.tsx`):
   - Table showing: email, tenant, role, status, created, actions
   - Status badges: Pending (yellow), Accepted (green), Expired (gray), Canceled (red)
   - Actions: Resend (for pending), Cancel (for pending)
   - Filter by status
   - Pagination

8. **Create InvitationsPage** (`apps/web/src/app/admin/invitations/page.tsx`):
   - Page header with "Invite User" button
   - InvitationList component
   - InvitationDialog (opened by button)

9. **Create Server Actions** (`apps/web/src/actions/invitations.ts`):
   - `createInvitationAction(email, tenantId, role)`
   - `getInvitationsAction(tenantId?, status?)`
   - `resendInvitationAction(id)`
   - `cancelInvitationAction(id)`

10. **Create Accept Invitation Page** (`apps/web/src/app/invite/[token]/page.tsx`):
    - Fetch invitation details by token
    - Show: "You've been invited to join [tenant name] as [role]"
    - Two paths:
      - If logged in: "Accept Invitation" button
      - If not logged in: "Sign up to accept" with link to /register?invitation=[token]
    - Handle errors: invalid token, expired, already accepted
    - On accept: redirect to /dashboard

11. **Update Register Flow**:
    - Check for `invitation` query param
    - If present, pre-fill email and tenant
    - After registration, auto-accept invitation

12. **Add to Admin Sidebar**:
    - Add "Invitations" link to admin menu
    - Icon: Mail or UserPlus

**Shared Schemas:**

13. **Update shared schemas** (`packages/shared/src/admin/invitation.schema.ts`):
    - `createInvitationSchema` - { email, tenantId, role }
    - `invitationResponseSchema` - { id, email, tenantId, role, status, createdAt, expiresAt, acceptedAt }
    - `invitationListQuerySchema` - { tenantId?, status? }
    - Export types

**Files to Create:**
- `apps/api/src/admin/invitation/invitation.service.ts`
- `apps/api/src/admin/invitation/invitation.controller.ts`
- `apps/api/src/admin/invitation/invitation.module.ts`
- `apps/api/src/invitation/invitation.controller.ts` (public)
- `apps/api/src/invitation/invitation.module.ts` (public)
- `apps/web/src/components/admin/invitation-dialog.tsx`
- `apps/web/src/components/admin/invitation-list.tsx`
- `apps/web/src/app/admin/invitations/page.tsx`
- `apps/web/src/app/invite/[token]/page.tsx`
- `apps/web/src/actions/invitations.ts`
- `packages/shared/src/admin/invitation.schema.ts`

**Files to Modify:**
- `apps/api/src/admin/admin.module.ts` (import InvitationModule)
- `apps/api/src/app.module.ts` (import public InvitationModule)
- `packages/shared/src/index.ts` (export invitation schemas)
- `apps/web/src/components/admin/admin-layout.tsx` (add Invitations link)
- `apps/web/src/app/register/page.tsx` (handle invitation param)

**Verification:**
- [ ] Admin can create invitation
- [ ] Invitation email is sent
- [ ] Invitation appears in list
- [ ] Invitee can view invitation details
- [ ] Invitee can accept invitation (logged in)
- [ ] Invitee can accept invitation (new user via register)
- [ ] UserTenant record is created
- [ ] Invitation status updates to accepted
- [ ] Admin can resend invitation
- [ ] Admin can cancel invitation
- [ ] Expired invitations cannot be accepted
- [ ] Duplicate invitations are prevented
- [ ] Audit logs capture invitation events

---

### Step 6: Testing (2 hours)

**Objective:** Write tests for new features

**Tests to Write:**

1. **MaintenanceService Tests** (`apps/api/src/admin/system/maintenance.service.spec.ts`):
   - Enable maintenance mode
   - Disable maintenance mode
   - Get status
   - Audit logging

2. **ImpersonationService Tests** (`apps/api/src/admin/impersonation/impersonation.service.spec.ts`):
   - Start impersonation
   - Stop impersonation
   - Token generation
   - Cannot impersonate SUPER_ADMIN
   - Cannot impersonate self
   - Expiry handling

3. **InvitationService Tests** (`apps/api/src/admin/invitation/invitation.service.spec.ts`):
   - Create invitation
   - Accept invitation
   - Resend invitation
   - Cancel invitation
   - Duplicate prevention
   - Expiry handling
   - Email sending

**Verification:**
- [ ] All new tests pass
- [ ] Existing tests still pass
- [ ] Test coverage > 70% for new services

---

## Verification Checklist

### Security Hardening
- [ ] Helmet installed
- [ ] Security headers present in responses
- [ ] Admin dashboard still works

### Maintenance Mode
- [ ] Maintenance can be enabled/disabled
- [ ] Non-admin users get 503 when maintenance is active
- [ ] Admin users can still access /admin
- [ ] /health endpoint still works
- [ ] Maintenance page shows message
- [ ] Audit logs capture maintenance events
- [ ] Status endpoint returns correct state

### User Impersonation
- [ ] Admin can start impersonation
- [ ] Token is generated with correct claims
- [ ] Admin can access app as target user
- [ ] Banner shows when impersonating
- [ ] Admin can stop impersonation
- [ ] Token expires after 1 hour
- [ ] Cannot impersonate SUPER_ADMIN
- [ ] Cannot impersonate self
- [ ] Audit logs capture impersonation events
- [ ] Permission check works

### Email Service
- [ ] Resend installed
- [ ] EmailService can send test email
- [ ] Templates render correctly
- [ ] Email failures are logged but don't crash
- [ ] Works in dev mode without API key

### User Invitations
- [ ] Admin can create invitation
- [ ] Invitation email is sent
- [ ] Invitation appears in list
- [ ] Invitee can view invitation details
- [ ] Invitee can accept invitation (logged in)
- [ ] Invitee can accept invitation (new user)
- [ ] UserTenant record is created
- [ ] Invitation status updates
- [ ] Admin can resend/cancel invitations
- [ ] Expired invitations cannot be accepted
- [ ] Duplicate invitations are prevented
- [ ] Audit logs capture invitation events

### Testing
- [ ] All new tests pass
- [ ] Existing tests still pass
- [ ] Test coverage > 70% for new services

---

## Known Context

### Architecture Patterns

**Backend (NestJS):**
- Controllers use guards: `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)`
- Permissions via decorator: `@Permissions('permission:name')`
- Validation via pipe: `@Body(new ZodValidationPipe(schema))`
- Services inject Prisma: `@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient`
- Audit logging: `this.auditService.log({ userId, action, details, ip, userAgent })`

**Frontend (Next.js):**
- Server actions in `apps/web/src/actions/*.ts`
- Components use TanStack Table for data grids
- UI components from shadcn/ui (Radix UI primitives)
- Toast notifications via sonner
- Forms with react-hook-form + zod

**Database (Prisma):**
- Models in `packages/database/prisma/schema.prisma`
- Migrations via `npx prisma migrate dev`
- Client generated to `packages/database/src/generated/prisma`

**Shared Package:**
- Zod schemas in `packages/shared/src/admin/*.schema.ts`
- Export from `packages/shared/src/index.ts`
- Build: `pnpm --filter shared build`

### Key File Locations

**API:**
- Controllers: `apps/api/src/admin/[feature]/[feature].controller.ts`
- Services: `apps/api/src/admin/[feature]/[feature].service.ts`
- Modules: `apps/api/src/admin/[feature]/[feature].module.ts`
- Tests: `*.spec.ts` alongside implementation

**Web:**
- Pages: `apps/web/src/app/admin/[feature]/page.tsx`
- Components: `apps/web/src/components/admin/[feature].tsx`
- Actions: `apps/web/src/actions/[feature].ts`

**Shared:**
- Schemas: `packages/shared/src/admin/[feature].schema.ts`
- Types: Exported from `packages/shared/src/index.ts`

### Environment Variables

**Existing:**
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing (min 32 chars)
- `CORS_ORIGINS` - Comma-separated origins
- `THROTTLE_TTL`, `THROTTLE_LIMIT` - Rate limiting

**New (to add):**
- `RESEND_API_KEY` - Resend API key (optional for dev)
- `EMAIL_FROM` - Sender email address

### Database Models

**UserInvitation (exists, not used yet):**
```prisma
model UserInvitation {
  id         String    @id @default(cuid())
  email      String
  token      String    @unique
  tenantId   String?
  role       Role
  invitedBy  String
  acceptedAt DateTime?
  expiresAt  DateTime
  createdAt  DateTime  @default(now())
  
  tenant    Tenant? @relation(...)
  invitedByUser User @relation(...)
  
  @@index([email])
  @@index([expiresAt])
}
```

**SystemConfig (exists, used for IP allowlist):**
```prisma
model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  description String?
  updatedAt   DateTime @updatedAt
  updatedBy   String?
}
```

### Permissions

**Existing:**
- `user:read`, `user:write`, `user:delete`, `user:suspend`, `user:reset-password`
- `tenant:read`, `tenant:write`, `tenant:delete`, `tenant:suspend`
- `role:read`, `role:write`, `role:delete`
- `admin:access`, `admin:audit`
- `system:maintenance` (exists, not used)
- `user:impersonate` (exists, only SUPER_ADMIN has it)

**To Update:**
- Add `user:impersonate` to ADMIN role

### Audit Actions

**Existing:**
- `auth.login`, `auth.logout`, `auth.failed`
- `user.created`, `user.updated`, `user.deleted`, `user.suspended`, `user.activated`
- `tenant.created`, `tenant.updated`, `tenant.deleted`, `tenant.suspended`, `tenant.restored`
- `role.created`, `role.updated`, `role.deleted`, `role.permissions`
- `session.revoked`, `session.all_revoked`
- `system.maintenance_on`, `system.maintenance_off` (exists, not used)

**To Add:**
- `user.impersonation_started`, `user.impersonation_stopped`
- `invitation.created`, `invitation.accepted`, `invitation.resend`, `invitation.canceled`

---

## Execution Order

**Recommended sequence:**
1. Security hardening (quick win, no dependencies)
2. Maintenance mode (uses existing SystemConfig, no dependencies)
3. Email service (prerequisite for invitations)
4. User invitations (depends on email service)
5. User impersonation (independent, can be done anytime)
6. Testing (after all features are built)

**Alternative sequence (if email is delayed):**
1. Security hardening
2. Maintenance mode
3. User impersonation
4. Testing (for maintenance + impersonation)
5. Email service
6. User invitations
7. Testing (for invitations)

---

## Success Criteria

**MVP is complete when:**
- ✅ Admins can put system in maintenance mode
- ✅ Admins can impersonate users for support
- ✅ Admins can invite users to tenants via email
- ✅ All features have tests
- ✅ All features are documented
- ✅ Security headers are in place
- ✅ No critical bugs or security issues

---

## Notes for Next Session

1. **This plan is self-contained** - No need to re-read the entire codebase
2. **File paths are accurate** - All paths have been verified
3. **Dependencies are clear** - Each step lists what it depends on
4. **Patterns are documented** - Follow existing patterns for consistency
5. **Verification is explicit** - Each step has a checklist
6. **Test before committing** - Run `pnpm test` after each major feature
7. **Build before deploying** - Run `pnpm build` to catch type errors

**Ready to execute. Good luck!**
