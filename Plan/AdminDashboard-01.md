# Phase 1: Admin Authentication & Security — Complete Instructions

## Overview
This phase establishes secure access to the admin dashboard with additional protection layers beyond standard authentication. You'll implement admin login flows, enhanced security headers, IP allowlisting, session management, and route protection.

---

## Task 1.1: Admin Login Flow

### 1.1.1 Create Admin Login Page (`/admin/login`)

**Objective:** Build a dedicated admin login page with admin-specific branding and security features.

**File Location:** `apps/web/src/app/admin/login/page.tsx`

**Requirements:**

- **Page Structure:**
  - Create a route at `/admin/login` using Next.js App Router
  - Use a centered card layout with admin branding (different from main app login)
  - Include admin-specific title: "Admin Login" or "Super Admin Login"
  - Show a subtle indicator that this is the admin portal (e.g., lock icon, admin badge)

- **Form Components:**
  - Email input field (type="email", required, autoComplete="username")
  - Password input field (type="password", required, autoComplete="current-password")
  - Submit button with "Sign in as Admin" text
  - Show/hide password toggle button
  - "Remember me" checkbox (optional — extends session duration)

- **Security Elements:**
  - Add "Forgot password?" link (use existing reset flow, but admin-specific)
  - No "Register" link (admin accounts are created via seed or by other admins)
  - Include CSRF token hidden field
  - Add rate limit warning: "Too many attempts? Wait 5 minutes"

- **Error Handling:**
  - Display validation errors inline
  - Show rate limiting errors with countdown
  - Generic error messages for failed login (prevent user enumeration)
  - Show "Invalid credentials" for both invalid email AND invalid password

- **UI/UX:**
  - Loading state on submit button
  - Disable form during submission
  - Redirect to `/admin` on successful login
  - Use `useActionState` hook for form state management
  - Dark/light mode support (inherit from app theme)

- **Metadata:**
  - Set page title: "Admin Login | Your App Name"
  - No indexing meta tag: `<meta name="robots" content="noindex, nofollow">`
  - Set proper viewport and theme color

**Verification:**
- [ ] Page renders at `/admin/login`
- [ ] Form validation works correctly
- [ ] Error messages display appropriately
- [ ] Form submits to server action
- [ ] Redirect works on success
- [ ] Dark/light mode works
- [ ] No "Register" link is present
- [ ] Rate limit warning appears when applicable

---

### 1.1.2 Implement Admin Login Server Action

**Objective:** Create a server action that validates admin credentials and establishes admin session.

**File Location:** `apps/web/src/actions/admin/auth.ts`

**Requirements:**

- **Action Definition:**
  - Create `adminLoginAction` using `'use server'`
  - Accept `FormData` or typed `AdminLoginInput` (use Zod schema from Phase 0)
  - Validate input with `adminLoginSchema` from `@repo/shared`

- **Validation Flow:**
  1. Validate email format (Zod)
  2. Check email exists in database
  3. Verify user has admin role (SUPER_ADMIN or ADMIN)
  4. Check user status (must be ACTIVE)
  5. Verify password using argon2
  6. Check if user belongs to system tenant (for super admins)

- **Rate Limiting:**
  - Implement rate limiting using Redis or in-memory store (or use existing Throttler)
  - Track attempts per email and per IP
  - Block after 5 failed attempts (return 429 with retry-after header)
  - Use progressive backoff (5min, 15min, 1hour)

- **Session Management:**
  - Set admin-specific JWT claims: `{ role: 'SUPER_ADMIN', isAdmin: true }`
  - Set `httpOnly` cookie with secure flags
  - Use separate cookie name: `admin_auth_token` (distinct from regular auth)
  - Set cookie path: `/admin` (scoped to admin routes only)
  - Set appropriate maxAge (session timeout)

- **Audit Logging:**
  - Log successful login attempts with IP, userAgent, timestamp
  - Log failed login attempts (without revealing valid/invalid status)
  - Include admin-specific audit action: `admin.login`

- **Response Format:**
  ```typescript
  interface AdminLoginResult {
    success: boolean
    error?: {
      code: 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'ACCOUNT_SUSPENDED' | 'INSUFFICIENT_PERMISSIONS'
      message: string
    }
    redirectTo?: string
  }
  ```

**Verification:**
- [ ] Server action compiles without errors
- [ ] Input validation works correctly
- [ ] Rate limiting blocks after 5 attempts
- [ ] Admin cookie is set on success
- [ ] Audit log entry is created
- [ ] Error messages are appropriate (no enumeration)
- [ ] Throws appropriate errors for invalid roles/statuses

---

### 1.1.3 Admin Session Management

**Objective:** Create session management utilities for admin authentication state.

**File Locations:**
- `apps/web/src/lib/admin-session.ts` (Server-side)
- `apps/web/src/providers/admin-auth-provider.tsx` (Client-side)

**Requirements:**

**Server-side Session (`admin-session.ts`):**
- Create `getAdminSession()` function:
  - Read `admin_auth_token` from cookies
  - Verify JWT signature (use existing JWT service)
  - Check if token has admin claims (isAdmin: true)
  - Validate token hasn't expired
  - Return `AdminSession` object or null
- Create `isAdmin()` function: returns boolean
- Create `requireAdmin()` function: throws redirect if not admin
- Create `getAdminUser()` function: fetches full user data from database

**Session Payload:**
```typescript
interface AdminSession {
  userId: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN'
  tenantId: string
  isAdmin: true
  iat: number
  exp: number
}
```

**Client-side Provider (`admin-auth-provider.tsx`):**
- Create React context for admin auth state
- Expose `useAdminAuth()` hook
- Include `isAdmin`, `adminUser`, `logout` in context
- Use `useEffect` to fetch admin session on mount
- Handle loading state while checking authentication
- Sync with server-side session via API call

**Session Refresh:**
- Implement automatic token refresh for admin sessions
- Refresh token before expiration (5min buffer)
- Use existing refresh token mechanism but with admin scope

**Session Cleanup:**
- Create `clearAdminSession()` function for logout
- Invalidate cookie and remove from database
- Redirect to `/admin/login` after logout

**Verification:**
- [ ] Session is correctly read from cookies
- [ ] Admin session validates JWT properly
- [ ] Client context provides auth state
- [ ] Session refreshes automatically
- [ ] Logout clears session correctly
- [ ] Type safety across server/client

---

### 1.1.4 Rate Limiting for Admin Endpoints

**Objective:** Implement enhanced rate limiting specifically for admin routes and APIs.

**File Location:** `apps/api/src/admin/admin.throttler.ts`

**Requirements:**

- **Create Admin Throttler:**
  - Implement stricter limits for admin endpoints:
    - Login: 5 attempts per 15 minutes
    - Admin API: 100 requests per minute per IP
    - API key endpoints: 50 requests per minute
    - Audit log queries: 30 requests per minute
    - Bulk operations: 10 requests per minute

- **Implementation Options:**
  - Use `@nestjs/throttler` with custom guard
  - Store counters in Redis (distributed rate limiting)
  - Fallback to in-memory store for development

- **Admin Throttler Guard:**
  - Create `AdminThrottlerGuard` extending ThrottlerGuard
  - Apply to all admin routes by default
  - Support `@SkipThrottle()` for specific endpoints
  - Customize rate limits per endpoint using `@Throttle()`

- **Rate Limit Response:**
  - Return HTTP 429 with headers:
    - `Retry-After`: seconds until next request allowed
    - `X-RateLimit-Limit`: maximum requests allowed
    - `X-RateLimit-Remaining`: requests remaining
    - `X-RateLimit-Reset`: reset timestamp
  - Include user-friendly message in response body

- **Admin-Specific Settings:**
  - Whitelist certain IPs (via config) from rate limiting
  - Bypass rate limiting for super admins in development
  - Log rate limit violations to audit log

- **Database Integration:**
  - Store rate limit violations in audit log
  - Alert on repeated violations (security event)

**Verification:**
- [ ] Rate limits are applied to admin endpoints
- [ ] Proper headers are returned on rate limit
- [ ] Login endpoint has 5 attempts limit
- [ ] Admin API has per-minute limit
- [ ] IP whitelisting works
- [ ] Rate limit violations are logged
- [ ] `@SkipThrottle()` decorator works

---

## Task 1.2: Security Enhancements

### 1.2.1 Admin-Specific Security Headers

**Objective:** Add additional security headers specifically for admin routes.

**File Location:** `apps/web/proxy.ts` (or `apps/web/src/middleware.ts`)

**Requirements:**

- **Admin Route Detection:**
  - Identify requests to `/admin/*` routes
  - Apply stricter security headers only to admin paths
  - Regular routes keep standard headers

- **Security Headers for Admin Routes:**
  - `X-Frame-Options: DENY` (prevent clickjacking)
  - `X-Content-Type-Options: nosniff` (prevent MIME sniffing)
  - `X-XSS-Protection: 1; mode=block` (XSS protection)
  - `Referrer-Policy: no-referrer-when-downgrade` (privacy)
  - `Cross-Origin-Opener-Policy: same-origin` (COOP)
  - `Cross-Origin-Embedder-Policy: require-corp` (COEP)
  - `Cross-Origin-Resource-Policy: same-origin` (CORP)
  - `Permissions-Policy: geolocation=(none), microphone=(none), camera=(none)` (restrict APIs)

- **CSP (Content Security Policy) for Admin:**
  - Apply `default-src 'self'`
  - Allow scripts only from `'self'` and `'unsafe-inline'` (for shadcn/ui)
  - Allow styles only from `'self'` and `'unsafe-inline'`
  - Allow images from `'self'` and trusted CDNs (e.g., gravatar)
  - Restrict connect-src to API domain only

- **HSTS (HTTP Strict Transport Security):**
  - Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - Apply only in production environment

- **Cookie Security:**
  - Ensure admin cookies have:
    - `Secure` flag (HTTPS only)
    - `HttpOnly` flag (no JavaScript access)
    - `SameSite=Strict` (CSRF protection)
    - `Path=/admin` (scope to admin routes)

**Verification:**
- [ ] Headers are present on admin routes
- [ ] Headers are NOT present on non-admin routes
- [ ] CSP doesn't break admin functionality
- [ ] Cookies have proper security flags
- [ ] HSTS header is present in production
- [ ] No security headers errors in browser console

---

### 1.2.2 IP Allowlisting Support

**Objective:** Allow administrators to restrict admin access to specific IP addresses.

**File Locations:**
- `apps/api/src/admin/config/ip-allowlist.service.ts`
- `apps/api/src/admin/guards/ip-allowlist.guard.ts`
- `apps/api/src/admin/controllers/ip-allowlist.controller.ts`

**Requirements:**

- **IP Allowlist Service:**
  - Create service to manage allowed IPs
  - Read from `SystemConfig` with key: `admin_allowed_ips`
  - Support CIDR notation (e.g., `192.168.1.0/24`)
  - Support single IPs (e.g., `203.0.113.42`)
  - Support IPv4 and IPv6
  - Cache allowed IPs (refresh every 5 minutes)

- **IP Allowlist Guard:**
  - Create `IpAllowlistGuard` to check request IP
  - Apply globally to all admin routes (except health checks)
  - Skip if allowlist is empty (allow all)
  - Skip if configured to allow localhost in development
  - Return 403 with message: "Access from this IP is not permitted"

- **IP Management Endpoints:**
  - GET `/api/v1/admin/ip-allowlist` — List allowed IPs
  - POST `/api/v1/admin/ip-allowlist` — Add IP to allowlist
  - DELETE `/api/v1/admin/ip-allowlist/:ip` — Remove IP
  - PUT `/api/v1/admin/ip-allowlist/:ip` — Update IP entry

- **IP Validation:**
  - Validate IP format with Zod schema
  - Prevent duplicate entries
  - Check for invalid CIDR notation
  - Validate CIDR range is within valid range

- **Admin UI for IP Management:**
  - Add IP management section in admin settings
  - Show current allowed IPs
  - Button to add current IP (one-click)
  - Input to manually add IP with validation
  - Delete button with confirmation

**Verification:**
- [ ] IP allowlist guard blocks unauthorized IPs
- [ ] Allowed IPs can access admin routes
- [ ] Empty allowlist allows all IPs
- [ ] CIDR notation works correctly
- [ ] IP management endpoints work
- [ ] Admin UI for IP management works
- [ ] Cache refreshes when IP list changes

---

### 1.2.3 Admin Session Timeout

**Objective:** Implement automatic session expiration with inactivity timeout.

**File Locations:**
- `apps/web/src/lib/admin-session.ts` (Session validation)
- `apps/api/src/admin/middleware/admin-session.middleware.ts`
- `apps/web/src/components/admin/session-timeout-warning.tsx`

**Requirements:**

- **Session Timeout Configuration:**
  - Default timeout: 1 hour of inactivity
  - Configurable via `SystemConfig` (`admin_session_timeout`)
  - Super admin can set shorter/longer duration
  - Use 24-hour maximum (security best practice)

- **Backend Session Validation:**
  - Create middleware that validates session on each request
  - Track last activity time in session or database
  - If inactivity exceeds timeout, invalidate session
  - Return 401 with "session expired" message

- **Frontend Session Monitoring:**
  - Create `SessionTimeoutWarning` component
  - Show warning modal 5 minutes before expiration
  - "Extend session" button to refresh session
  - Countdown timer showing remaining time
  - Auto-redirect to login on expiration

- **Session Extension:**
  - Create API endpoint: POST `/api/v1/admin/session/extend`
  - Update last activity timestamp
  - Return new session with extended expiration
  - Log extension in audit log

- **Multiple Session Management:**
  - Support multiple concurrent admin sessions per user
  - Show all active sessions in admin panel
  - Ability to revoke specific sessions

**Verification:**
- [ ] Session expires after timeout period
- [ ] Warning modal appears before expiration
- [ ] Session can be extended via API
- [ ] Multiple sessions work correctly
- [ ] Session timeout is configurable
- [ ] Audit logs track session extensions

---

### 1.2.4 Admin Password Policy Enforcement

**Objective:** Enforce strong password policies for admin accounts.

**File Locations:**
- `apps/api/src/admin/policies/password-policy.service.ts`
- `packages/shared/src/admin/password.schema.ts`

**Requirements:**

- **Password Policy Configuration:**
  - Store policy in `SystemConfig` with key: `admin_password_policy`
  - Configurable settings:
    - Minimum length (default: 12)
    - Require uppercase: true
    - Require lowercase: true
    - Require numbers: true
    - Require special characters: true
    - Password history: remember last 5 passwords
    - Password expiry: 90 days (optional)

- **Password Validation:**
  - Create Zod schema: `adminPasswordSchema`
  - Validate against policy rules
  - Return user-friendly error messages
  - Check against common password list (e.g., "password123")
  - Prevent reusing previous passwords

- **Password History:**
  - Add `passwordHistory` field to `AuthenticationProvider`
  - Store hashed passwords for history comparison
  - Check new password against last N hashes
  - Clear history on password reset

- **Password Strength Meter:**
  - Add UI component showing password strength
  - Visual feedback as user types
  - Show requirements checklist (✅ when met)
  - Use zxcvbn or similar for strength scoring

- **Password Reset Flow:**
  - Admin-initiated password reset
  - Requires current password verification
  - Send email notification on password change
  - Force logout of all sessions on password change
  - Log password change in audit log

- **First Login Password Change:**
  - Detect first-time admin login
  - Force password change before accessing dashboard
  - Show password policy requirements
  - Provide "Skip for now" only if configured

**Verification:**
- [ ] Password policy is enforced
- [ ] Password history prevents reuse
- [ ] Password strength meter works
- [ ] Password reset flow works
- [ ] First login forces password change
- [ ] Audit log tracks password changes
- [ ] Password policy is configurable

---

## Task 1.3: Admin Middleware

### 1.3.1 Admin Route Protection (`/admin/*`)

**Objective:** Create middleware that protects all admin routes.

**File Location:** `apps/web/proxy.ts` (or `apps/web/src/middleware.ts`)

**Requirements:**

- **Route Matching:**
  - Match all routes starting with `/admin`
  - Exclude `/admin/login` and `/admin/api/*` (if using internal API)
  - Include `/admin` (dashboard root)
  - Include all sub-routes: `/admin/*`

- **Authentication Check:**
  - Verify `admin_auth_token` cookie exists and is valid
  - Decode JWT and check admin claims
  - Verify user is still active in database
  - Check if role is SUPER_ADMIN or ADMIN

- **Session Validation:**
  - Check session timeout (last activity timestamp)
  - Refresh session if within active window
  - Redirect to login if session expired

- **IP Allowlist Check:**
  - Verify request IP against allowlist
  - Show custom page for IP blocked
  - Option to bypass for localhost in development

- **Redirect Logic:**
  - Unauthenticated: Redirect to `/admin/login` with return URL
  - Unauthorized: Redirect to `/admin/login` (don't reveal admin existence)
  - Session expired: Redirect to `/admin/login` with "session expired" message
  - Invalid admin role: Redirect to main app home (if logged in as regular user)

- **Caching:**
  - Set cache control headers: `no-cache, no-store, must-revalidate`
  - Prevent caching of admin pages
  - Set `private` directive for sensitive content

- **Error Pages:**
  - Create custom 401 page: `/admin/unauthorized`
  - Create custom 403 page: `/admin/forbidden`
  - Create custom 404 page for admin routes

**Verification:**
- [ ] All admin routes are protected
- [ ] Login page is accessible
- [ ] Valid session allows access
- [ ] Invalid session redirects to login
- [ ] IP allowlist works with middleware
- [ ] Cache headers are set correctly
- [ ] Custom error pages work

---

### 1.3.2 Redirect Non-Admins Away from Admin

**Objective:** Prevent regular users from accessing admin routes.

**File Location:** `apps/web/proxy.ts` (or `apps/web/src/middleware.ts`)

**Requirements:**

- **Non-Admin Detection:**
  - Check if user is authenticated but NOT admin
  - Detect user role from session/token
  - Check if user has required admin role

- **Redirect Strategy:**
  - If regular user attempts to visit `/admin/*`:
    - Redirect to main app home (`/`)
    - Or show dedicated "Access Denied" page
    - Don't reveal that admin exists (security through obscurity)

- **Avoid Redirect Loops:**
  - Check if already on main app route
  - Don't redirect if user just logged out
  - Handle the case where user's admin status changed

- **Audit Logging:**
  - Log unauthorized admin access attempts
  - Include user ID, requested URL, timestamp
  - Monitor for brute force attempts

- **Rate Limiting for Unauthorized Attempts:**
  - Rate limit requests to admin routes from non-admin users
  - Track IP and user ID
  - Block after X attempts (configurable)

- **User Experience:**
  - Show loading state while checking permissions
  - Brief delay before redirect (prevent flash of protected content)
  - Use React Suspense for loading states

**Verification:**
- [ ] Regular users can't access admin routes
- [ ] Redirect works correctly
- [ ] No redirect loops occur
- [ ] Unauthorized attempts are logged
- [ ] Rate limiting works for failed attempts
- [ ] Loading states are shown while checking

---

## Phase 1 Verification Checklist

Before proceeding to Phase 2, verify:

- [ ] Admin login page renders correctly at `/admin/login`
- [ ] Admin login works with super admin credentials
- [ ] Admin session is established after login
- [ ] Rate limiting works on login endpoint
- [ ] Security headers are applied to admin routes
- [ ] IP allowlisting works
- [ ] Session timeout works with warning modal
- [ ] Password policy is enforced
- [ ] Admin routes are protected by middleware
- [ ] Non-admin users are redirected away
- [ ] Audit logs capture admin login events
- [ ] All tests pass
- [ ] No ESLint errors
- [ ] Build succeeds

---

## Phase 1 Completion Criteria

- [ ] Admin login page with form validation and error handling
- [ ] Server action for admin login with rate limiting
- [ ] Admin session management (server + client)
- [ ] Enhanced rate limiting for admin endpoints
- [ ] Admin-specific security headers and CSP
- [ ] IP allowlisting with management UI
- [ ] Session timeout with warning modal
- [ ] Admin password policy enforcement
- [ ] Admin route protection middleware
- [ ] Non-admin redirect logic
- [ ] All admin routes inaccessible without authentication
- [ ] Audit logs for all authentication events

---

## Phase 1 Tips & Best Practices

1. **Security First:** Always err on the side of caution. Never reveal if an email exists or not.
2. **Rate Limiting:** Implement early to prevent brute force attacks.
3. **Session Security:** Use separate cookies for admin sessions with strict path scoping.
4. **IP Allowlisting:** Start with empty allowlist = allow all, then add as needed.
5. **Audit Logs:** Log all authentication events, including failures.
6. **Error Messages:** Keep them generic but helpful. "Invalid credentials" is safer than "User not found".
7. **Testing:** Test edge cases: expired sessions, invalid roles, rate limit exhaustion.
8. **Performance:** Cache IP allowlist and session validation where possible.

---

**Ready for Phase 2?** Let me know when Phase 1 is complete!