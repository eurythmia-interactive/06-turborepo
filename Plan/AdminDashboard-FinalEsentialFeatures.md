# Essential Phases for MVP — Complete Instructions

## Overview
From the remaining phases (7-10), I've distilled the **most essential features** needed for a working admin dashboard. These are the features that provide immediate value without the "nice-to-have" extras. You can always add fancy features later.

---

## 🎯 Essential Features to Implement

### From Phase 7: Advanced Features
- ✅ **User Impersonation** — Debug user issues without passwords (critical for support)
- ✅ **User Invitations** — Invite users to tenants (essential for onboarding)
- ✅ **Bulk Operations** — Bulk suspend/delete (saves time on user management)

### From Phase 8: System Configuration
- ✅ **Maintenance Mode** — Put site in maintenance (essential for deployments)
- ✅ **Basic System Settings** — Configure key settings (important for flexibility)

### From Phase 9: Testing & Optimization
- ✅ **Critical Backend Tests** — Ensure core functionality works
- ✅ **Query Optimization** — Fix N+1 queries (performance is essential)
- ✅ **Security Audit** — Basic security checks (non-negotiable)

### From Phase 10: Deployment & Documentation
- ✅ **Environment Variables** — Configure for production
- ✅ **Database Migrations** — Production-ready migrations
- ✅ **Basic Documentation** — Admin user guide
- ✅ **CI/CD Update** — Deploy admin routes

---

## Skipped Features (Can Add Later)
- ❌ API Key Management (Phase 7.4)
- ❌ Feature Flags (Phase 8.1)
- ❌ Full Health Dashboard (Phase 8.4)
- ❌ Comprehensive Testing Coverage (Phase 9.1-9.4 — keep only critical)
- ❌ Detailed Documentation (Phase 10.2 — keep only essential)
- ❌ Advanced Monitoring (Phase 10.3)

---

# Essential Phase 7: User Impersonation & Invitations

### Task 7.1: User Impersonation (Essential)

#### 7.1.1 Impersonation Service

**File Location:** `apps/api/src/admin/impersonation/impersonation.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with Prisma client
  - Inject `AuditLogService` for logging
  - Check permissions: user must have `user:impersonate` permission

- **Core Methods:**

  **`startImpersonation(adminUserId: string, targetUserId: string)`**
  - Validate admin user exists and has permission
  - Validate target user exists and is not admin
  - Create special JWT token with:
    - `sub`: targetUserId
    - `impersonatedBy`: adminUserId
    - `isImpersonation`: true
    - Short expiration (1 hour max)
  - Store impersonation session in database (optional)
  - Log to audit: `user.impersonation_started`
  - Return impersonation token

  **`stopImpersonation(adminUserId: string, targetUserId: string)`**
  - Clear impersonation session
  - Revoke impersonation token
  - Log to audit: `user.impersonation_stopped`

  **`isImpersonating(request: Request)`**
  - Check if request has impersonation token
  - Return impersonation context if active

- **Security Limits:**
  - Max impersonation duration: 1 hour
  - Can only impersonate non-admin users
  - Cannot impersonate SUPER_ADMIN
  - Log all impersonation events

**Verification:**
- [ ] Impersonation service works
- [ ] Token is generated correctly
- [ ] Token expires after 1 hour
- [ ] Cannot impersonate admins
- [ ] Audit logs capture impersonation events

---

#### 7.1.2 Start/Stop Impersonation Endpoint

**File Location:** `apps/api/src/admin/impersonation/impersonation.controller.ts`

**Requirements:**

- **Endpoint Setup:**
  - `POST /api/v1/admin/impersonation/start`
  - `POST /api/v1/admin/impersonation/stop`
  - Apply admin guards and permissions

- **Start Endpoint:**
  - Body: `{ userId: string, reason?: string }`
  - Generate impersonation token
  - Set cookie: `impersonation_token`
  - Return success with redirect URL

- **Stop Endpoint:**
  - Clear impersonation cookie
  - Return success

- **Error Handling:**
  - 400: Invalid user
  - 403: Cannot impersonate this user
  - 403: Already impersonating

**Verification:**
- [ ] Start endpoint works
- [ ] Stop endpoint works
- [ ] Cookie is set/cleared correctly
- [ ] Error handling works

---

#### 7.1.3 Impersonation UI in User Management

**File Location:** `apps/web/src/components/admin/impersonate-button.tsx`

**Requirements:**

- **Button Component:**
  - Add "Impersonate" button in user actions menu
  - Show only for users with `user:impersonate` permission
  - Open confirmation dialog

- **Confirmation Dialog:**
  - Show warning: "You will be logged in as [user email]"
  - Require reason (required for audit)
  - Show duration: "Will expire in 1 hour"
  - Confirm button: "Start Impersonation"

- **Active Impersonation Indicator:**
  - Show banner at top of page: "Impersonating [user name]"
  - Show "Stop Impersonation" button
  - Color: Red/Orange for visibility

- **Back to Admin:**
  - "Return to Admin" button
  - Automatically redirects when impersonation stops

**Verification:**
- [ ] Impersonate button shows correctly
- [ ] Confirmation dialog works
- [ ] Active impersonation indicator shows
- [ ] Stop impersonation works

---

#### 7.1.4 Audit Logging for Impersonation

**File Location:** `apps/api/src/admin/impersonation/impersonation.service.ts` (extend)

**Requirements:**

- **Audit Events:**
  - `user.impersonation_started`: Admin started impersonating
  - `user.impersonation_stopped`: Admin stopped impersonating
  - `user.impersonation_expired`: Impersonation expired

- **Audit Fields:**
  - `impersonatedBy`: Admin who started impersonation
  - `impersonatedUser`: User being impersonated
  - `reason`: Why impersonation was needed
  - `duration`: How long impersonation lasted

- **Security Monitoring:**
  - Alert if impersonation lasts > 45 minutes
  - Alert if multiple impersonations from same admin
  - Alert if impersonation of sensitive users

**Verification:**
- [ ] Audit logs capture all impersonation events
- [ ] Alert system works (if implemented)
- [ ] Logs show required fields

---

### Task 7.2: Bulk Operations (Essential)

#### 7.2.1 Bulk Suspend Users

**File Location:** `apps/api/src/admin/user/user-admin.service.ts` (extend)

**Requirements:**

- **Endpoint:**
  - `POST /api/v1/admin/users/bulk/suspend`
  - Body: `{ userIds: string[], reason: string }`

- **Implementation:**
  - Validate all users exist
  - Prevent suspending self
  - Prevent suspending SUPER_ADMIN users
  - Process in batches of 50
  - Log each suspension individually
  - Return success/failure counts

- **Response:**
  ```typescript
  {
    success: true
    suspended: number
    failed: number
    errors: Array<{ userId: string, error: string }>
    batch: number
  }
  ```

**Verification:**
- [ ] Bulk suspend works
- [ ] Self-suspension is prevented
- [ ] SUPER_ADMIN users are protected
- [ ] Batch processing works

---

#### 7.2.2 Bulk Delete Users

**File Location:** `apps/api/src/admin/user/user-admin.service.ts` (extend)

**Requirements:**

- **Endpoint:**
  - `POST /api/v1/admin/users/bulk/delete`
  - Body: `{ userIds: string[], options: DeleteOptions }`

- **Implementation:**
  - Validate all users exist
  - Prevent deleting self
  - Prevent deleting SUPER_ADMIN users
  - Process in batches of 50
  - Log each deletion individually
  - Return success/failure counts

- **Safety Features:**
  - Require confirmation: `confirm: true`
  - Option for soft delete vs hard delete
  - Data retention options

**Verification:**
- [ ] Bulk delete works
- [ ] Self-deletion is prevented
- [ ] SUPER_ADMIN users are protected
- [ ] Confirmation is required

---

### Task 7.3: User Invitations (Essential)

#### 7.3.1 Invitation Service

**File Location:** `apps/api/src/admin/invitation/invitation.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with Prisma client
  - Inject `EmailService` for sending invitations
  - Inject `AuditLogService` for logging

- **Core Methods:**

  **`createInvitation(data: CreateInvitationDto)`**
  - Validate email format
  - Check if user already exists (return conflict)
  - Check if invitation already pending (return conflict)
  - Generate secure token (random string, 32 bytes)
  - Set expiration: 7 days from creation
  - Store in database
  - Send invitation email
  - Log to audit: `invitation.created`

  **`acceptInvitation(token: string, data: AcceptInvitationDto)`**
  - Validate token exists and is not expired
  - Check if token has been used
  - Create user account (if new)
  - Add user to tenant with role
  - Mark invitation as accepted
  - Log to audit: `invitation.accepted`

  **`resendInvitation(invitationId: string)`**
  - Check invitation exists and is pending
  - Resend invitation email
  - Log to audit: `invitation.resend`

  **`cancelInvitation(invitationId: string)`**
  - Cancel pending invitation
  - Log to audit: `invitation.canceled`

- **Invitation Data:**
  ```typescript
  interface Invitation {
    id: string
    email: string
    token: string  // Hashed in database
    tenantId: string
    role: Role
    invitedBy: string  // User ID
    expiresAt: Date
    acceptedAt: Date?
    createdAt: Date
  }
  ```

**Verification:**
- [ ] Invitation service works
- [ ] Token generation is secure
- [ ] Email is sent on creation
- [ ] Expiration works (7 days)
- [ ] Duplicate invitations are prevented

---

#### 7.3.2 Invitation Endpoints

**File Location:** `apps/api/src/admin/invitation/invitation.controller.ts`

**Requirements:**

- **Endpoints:**
  - `POST /api/v1/admin/invitations` — Create invitation
  - `GET /api/v1/admin/invitations` — List invitations
  - `POST /api/v1/admin/invitations/:id/resend` — Resend invitation
  - `DELETE /api/v1/admin/invitations/:id` — Cancel invitation

- **Create Invitation:**
  - Body: `{ email, tenantId, role, message? }`
  - Apply `@RequirePermission('user:write')`
  - Send invitation email with accept link

- **List Invitations:**
  - Query parameters: page, limit, status (pending/accepted/expired)
  - Include: invited by, tenant, role, status, created at

- **Public Accept Endpoint:**
  - `GET /api/v1/invitations/accept/:token`
  - `POST /api/v1/invitations/accept/:token`
  - Public endpoint (no auth required)
  - Show invitation details
  - Allow user to create account or login

**Verification:**
- [ ] All endpoints work
- [ ] Create sends email
- [ ] Accept endpoint works
- [ ] Resend works
- [ ] Cancel works

---

#### 7.3.3 Invitation UI

**File Location:** `apps/web/src/components/admin/invitation-ui.tsx`

**Requirements:**

- **Send Invitation Modal:**
  - Email input (with validation)
  - Tenant dropdown (required)
  - Role dropdown (ADMIN, MEMBER, GUEST)
  - Optional message textarea
  - Send button

- **Invitation List:**
  - Table showing: Email, Tenant, Role, Status, Created
  - Status badges: Pending, Accepted, Expired, Canceled
  - Actions: Resend, Cancel
  - Sort and filter

- **Invitation Preview:**
  - Show what email will look like
  - Customizable message

**Verification:**
- [ ] Send invitation modal works
- [ ] Invitation list shows all invitations
- [ ] Status badges work
- [ ] Resend works
- [ ] Cancel works

---

### Task 7.3.4 Invitation Acceptance Flow

**File Location:** `apps/web/src/app/invite/accept/[token]/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/invite/accept/:token`
  - Show invitation details
  - Two options: Login or Sign Up

- **Flow for Existing Users:**
  1. Show: "You have been invited to [tenant name]"
  2. "Login to accept" button
  3. After login: automatically accept invitation
  4. Redirect to dashboard

- **Flow for New Users:**
  1. Show: "You have been invited to [tenant name]"
  2. Sign up form: Name, Email (pre-filled), Password
  3. After sign up: automatically accept invitation
  4. Redirect to dashboard

- **Error States:**
  - Invalid token: "This invitation is invalid"
  - Expired token: "This invitation has expired"
  - Already accepted: "You have already accepted this invitation"

**Verification:**
- [ ] Invitation page works
- [ ] Login flow works
- [ ] Sign up flow works
- [ ] Error states work
- [ ] Automatic acceptance works

---

## Essential Phase 8: System Configuration

### Task 8.1: Maintenance Mode

#### 8.1.1 Maintenance Service

**File Location:** `apps/api/src/admin/maintenance/maintenance.service.ts`

**Requirements:**

- **Service Setup:**
  - Use SystemConfig or dedicated table
  - Cache maintenance state
  - Service methods: enable, disable, check

- **Core Methods:**

  **`enableMaintenance(data: MaintenanceData)`**
  ```typescript
  interface MaintenanceData {
    message: string  // Show to users
    scheduledEnd?: Date
    notifyUsers?: boolean
  }
  ```
  - Set maintenance mode to true
  - Store message in config
  - Log to audit: `system.maintenance_on`
  - Clear all caches

  **`disableMaintenance()`**
  - Set maintenance mode to false
  - Log to audit: `system.maintenance_off`

  **`isMaintenanceMode()`**
  - Check current maintenance state
  - Return: { enabled: boolean, message: string, scheduledEnd?: Date }

  **`shouldBypass(request: Request)`**
  - Allow admins to bypass maintenance
  - Check: user has admin role OR IP is whitelisted

**Verification:**
- [ ] Maintenance service works
- [ ] Enable/disable works
- [ ] Bypass works for admins
- [ ] Audit logs capture events

---

#### 8.1.2 Toggle Maintenance Mode Endpoint

**File Location:** `apps/api/src/admin/maintenance/maintenance.controller.ts`

**Requirements:**

- **Endpoints:**
  - `POST /api/v1/admin/system/maintenance/enable`
  - `POST /api/v1/admin/system/maintenance/disable`
  - `GET /api/v1/admin/system/maintenance/status`

- **Enable Endpoint:**
  - Body: `{ message: string, scheduledEnd?: Date }`
  - Apply `@RequirePermission('system:maintenance')`
  - Enable maintenance mode

- **Disable Endpoint:**
  - Apply `@RequirePermission('system:maintenance')`
  - Disable maintenance mode

- **Status Endpoint:**
  - Public endpoint
  - Return maintenance state

**Verification:**
- [ ] Enable works
- [ ] Disable works
- [ ] Status works
- [ ] Permission check works

---

#### 8.1.3 Maintenance Page

**File Location:** `apps/web/src/app/maintenance/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/maintenance`
  - Show when maintenance mode is enabled
  - Show message from config

- **Page Content:**
  - Logo/branding
  - Maintenance message
  - Estimated completion time (if scheduled)
  - Contact email
  - Status update (if dynamic)

- **Admin Bypass:**
  - Check for admin cookie
  - If admin, show "Continue to Admin" button
  - Uses admin bypass logic

**Verification:**
- [ ] Maintenance page shows
- [ ] Message is displayed
- [ ] Admin bypass works
- [ ] Branding is consistent

---

## Essential Phase 9: Testing & Optimization

### Task 9.1: Critical Backend Tests

**File Location:** `apps/api/src/admin/**/*.spec.ts`

**Requirements:**

- **Essential Tests to Write:**
  - **Admin Auth Tests**:
    - Admin login with valid credentials
    - Admin login with invalid credentials
    - Rate limiting on admin login
    - Admin route protection
  - **Tenant Management Tests**:
    - Create tenant (success)
    - Create tenant (duplicate slug)
    - Suspend tenant (with user cascade)
    - Restore tenant
  - **User Management Tests**:
    - Create user (success)
    - Create user (duplicate email)
    - Suspend user
    - Activate user
    - Force password reset
  - **Role Management Tests**:
    - Create role (success)
    - Create role (duplicate name)
    - Assign permissions to role
    - Delete role (in use validation)
  - **Audit Log Tests**:
    - Log creation
    - Log retrieval with filters
    - Export functionality

- **Test Setup:**
  - Use test database
  - Mock email service
  - Use test factories
  - Test isolation

**Verification:**
- [ ] All critical tests pass
- [ ] Test coverage > 70% for critical paths
- [ ] Tests run in CI

---

### Task 9.2: Query Optimization

**File Location:** `apps/api/src/admin/**/*.service.ts`

**Requirements:**

- **Optimization Tasks:**
  - **N+1 Query Fixes**:
    - Use Prisma `include` with proper relations
    - Use `_count` for counting related records
    - Use batch loading for repeated queries
  
  - **Indexing**:
    - Add indexes on: `userId`, `tenantId`, `action`, `createdAt`
    - Add composite indexes for common queries
  
  - **Pagination**:
    - Implement cursor-based pagination for large tables
    - Use `take` and `skip` with proper ordering
  
  - **Caching**:
    - Cache dashboard metrics (5 minutes)
    - Cache permission resolution (5 minutes)
    - Invalidate cache on changes

- **Performance Monitoring:**
  - Add logging for slow queries (> 1 second)
  - Track query execution time
  - Identify optimization opportunities

**Verification:**
- [ ] N+1 queries are fixed
- [ ] Indexes are added
- [ ] Pagination works efficiently
- [ ] Caching works
- [ ] Query performance is acceptable (< 200ms)

---

### Task 9.3: Security Audit

**File Location:** Entire codebase

**Requirements:**

- **Security Checks:**
  - **Authentication**:
    - JWT token validation
    - Token expiration
    - Cookie security (HttpOnly, Secure, SameSite)
    - Rate limiting on auth endpoints
  
  - **Authorization**:
    - Admin route protection
    - Permission checks on all endpoints
    - Role-based access control
  
  - **Data Protection**:
    - Password hashing (argon2)
    - No sensitive data in logs
    - SQL injection prevention (Prisma handles)
    - XSS prevention (React handles)
  
  - **Infrastructure**:
    - CORS configuration
    - Security headers
    - Environment variable validation

- **Manual Testing:**
  - Try to access admin routes without token
  - Try to access admin routes with regular user token
  - Try to bypass permission checks
  - Check for sensitive data exposure in responses

**Verification:**
- [ ] All security checks pass
- [ ] No sensitive data exposed
- [ ] Admin routes are properly protected
- [ ] Permission system works correctly

---

## Essential Phase 10: Deployment & Documentation

### Task 10.1: Production Readiness

**File Location:** Root directory and configuration files

**Requirements:**

- **Environment Variables:**
  ```env
  # Admin specific
  ADMIN_IP_WHITELIST=192.168.1.0/24,10.0.0.0/8
  ADMIN_SESSION_TIMEOUT=3600  # 1 hour
  ADMIN_RATE_LIMIT=5  # per minute
  
  # Security
  JWT_SECRET=strong-secret-key
  COOKIE_SECURE=true  # In production
  
  # Maintenance
  MAINTENANCE_EMAIL=admin@example.com
  ```

- **Database Migrations:**
  - Create final migration with all admin models
  - Test migration on staging
  - Prepare rollback plan

- **Admin Seed Data:**
  - Seed SUPER_ADMIN user
  - Seed system tenant
  - Seed default roles and permissions

- **Production Build:**
  - Ensure environment-specific configs
  - Build both apps with production settings
  - Test production build locally

**Verification:**
- [ ] Environment variables are configured
- [ ] Migrations work on production database
- [ ] Seed data is created
- [ ] Production build works

---

### Task 10.2: Basic Documentation

**File Location:** `docs/` directory

**Requirements:**

- **Admin User Guide** (`docs/admin-guide.md`):
  - How to log in to admin dashboard
  - How to manage tenants (create, edit, suspend)
  - How to manage users (create, edit, suspend, impersonate)
  - How to manage roles and permissions
  - How to invite users
  - How to use audit logs
  - How to enable maintenance mode

- **Super Admin Manual** (`docs/super-admin.md`):
  - First-time setup
  - How to create new admin accounts
  - How to manage system settings
  - Security best practices
  - Troubleshooting guide

- **Deployment Guide** (`docs/deployment.md`):
  - Environment variable configuration
  - Database migration steps
  - Docker deployment commands
  - Health check endpoints
  - Rollback procedures

**Verification:**
- [ ] All documents are created
- [ ] Documentation is accurate
- [ ] Instructions are actionable

---

### Task 10.3: CI/CD Update

**File Location:** `.github/workflows/ci.yml`

**Requirements:**

- **Update CI Pipeline:**
  - Add admin-specific environment variables
  - Add admin database migrations
  - Add admin E2E tests
  - Deploy admin routes

- **Deployment Steps:**
  1. Build admin applications
  2. Run database migrations
  3. Seed admin data (if first deploy)
  4. Deploy to staging/production
  5. Verify health endpoints

- **Rollback Procedure:**
  - Document rollback steps
  - Test rollback process
  - Ensure data integrity

**Verification:**
- [ ] CI pipeline works
- [ ] Deployment succeeds
- [ ] Rollback procedure works
- [ ] Health checks pass

---

## Implementation Timeline (Essential Features)

| Week | Tasks |
|------|-------|
| **Week 1** | Phase 7.1: User Impersonation |
| **Week 2** | Phase 7.2: Bulk Operations + Phase 7.3: User Invitations |
| **Week 3** | Phase 8.1: Maintenance Mode + Phase 10.1: Production Readiness |
| **Week 4** | Phase 9.1-9.3: Critical Testing + Security Audit |
| **Week 5** | Phase 10.2-10.3: Documentation + CI/CD |

**Total: ~5 weeks** for essential features (vs ~8-10 weeks for all features)

---

## Phase 7-10 Verification Checklist (Essential)

- [ ] User impersonation works
- [ ] Bulk suspend/delete works
- [ ] User invitations work (create + accept)
- [ ] Maintenance mode works
- [ ] Production environment configured
- [ ] Critical backend tests pass
- [ ] Query performance is optimized
- [ ] Security audit passes
- [ ] Documentation is complete
- [ ] CI/CD pipeline works

---

## Final Notes

### What You Have Now:
- ✅ Full admin authentication system
- ✅ Complete tenant management
- ✅ Complete user management
- ✅ Role and permission management
- ✅ Dashboard with metrics
- ✅ Audit logs and session management
- ✅ User impersonation for support
- ✅ Bulk operations for efficiency
- ✅ User invitation system for onboarding
- ✅ Maintenance mode for deployments
- ✅ Production-ready configuration
- ✅ Essential tests and security checks

### What You Can Add Later:
- Feature flags (A/B testing)
- API key management (developer API)
- Detailed health dashboard (monitoring)
- Comprehensive testing coverage (quality)
- Advanced analytics (insights)
- OAuth integration (social login)

---

**The essential features are complete!** You now have a fully functional admin dashboard that you can deploy to production and start using immediately.