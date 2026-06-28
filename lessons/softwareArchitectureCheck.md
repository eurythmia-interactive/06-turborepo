# 🏗️ Architectural Review: Turborepo Multi-Tenant SaaS Platform

## Executive Summary

This is a **well-structured, ambitious multi-tenant SaaS platform** built on a modern Turborepo monorepo with NestJS + Next.js 16 + Prisma. The codebase demonstrates strong fundamentals: contract-first API design via shared Zod schemas, proper JWT refresh-token rotation with reuse detection, and comprehensive admin features (RBAC, impersonation, audit logging, analytics). However, there are **three dangerous issues** that must be addressed before production: (1) the access-token cookie is set with `httpOnly: false`, exposing JWTs to XSS; (2) the frontend middleware (`proxy.ts`) is never wired up, leaving routes unprotected at the edge; and (3) the `user_role` cookie is trusted for authorization decisions despite being client-tamperable. Beyond security, the codebase has a systemic `forwardRef` circular dependency problem and in-memory caches that will break under horizontal scaling.

---

## 🟢 Strengths (What's Working Well)

- **Shared Zod schemas as API contracts** (`packages/shared`) — Both frontend and backend consume the same validation schemas and TypeScript types. This eliminates an entire class of "API changed but frontend didn't know" bugs. _This is the single best architectural decision in the codebase._

- **Refresh token rotation with family-based reuse detection** (`auth.service.ts:232-319`) — Properly implements the "issue new token on each refresh, revoke entire family on reuse" pattern. This is textbook secure session management.

- **Argon2 for password hashing** — Best-in-class choice. Memory-hard, resistant to GPU/ASIC attacks.

- **Prisma singleton with dev hot-reload** (`packages/database/src/index.ts`) — Correctly uses `globalThis` to prevent multiple Prisma clients during HMR. Connection pooling is properly configured via `PrismaPg` adapter.

- **`Promise.all` for parallel DB queries** (`metrics-aggregation.service.ts:29-106`) — The dashboard metrics endpoint fires 18 queries in parallel instead of sequentially. This is a 10-15x latency improvement.

- **Global exception filter with Prisma error mapping** (`global-exception.filter.ts`) — Maps Prisma error codes (P2002, P2025, etc.) to user-friendly HTTP responses. Stack traces are hidden in production.

- **Comprehensive test infrastructure** — Unit tests with Vitest, E2E tests with `@testcontainers/postgresql`, MSW for frontend mocking, and test helpers for DB sandboxing. This is a mature testing setup.

- **Turborepo pipeline configuration** (`turbo.json`) — Properly configured with `dependsOn: ["^build", "^db:generate"]`, ensuring Prisma client is generated before any app builds. Cache outputs are correctly scoped.

- **Environment validation with Zod** (`env.validation.ts`) — App refuses to start with invalid env vars. This prevents the dreaded "works on my machine" runtime failures.

- **Trace ID propagation** (`request-logger.middleware.ts`) — Every request gets a `traceId` (from `x-trace-id` header or generated), enabling request correlation in logs.

---

## 🟡 Yellow Flags (Warnings)

| #   | Issue                                                                                                                                                                                                                                                                                                                       | Risk       | Location                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 1   | **12+ `forwardRef` calls creating a circular dependency web** — `AuthModule ↔ AdminModule`, and nearly every admin sub-module imports `AdminModule` via `forwardRef`. This is NestJS's escape hatch for circular deps, but it's being used as a crutch. The module graph is a tangled ball of yarn.                         | **High**   | `apps/api/src/admin/**/*.module.ts`, `apps/api/src/auth/auth.module.ts`                          |
| 2   | **In-memory caches won't survive horizontal scaling** — `DashboardCacheService`, `PermissionCacheService`, and `ImpersonationService` all use `new Map()`. With 2+ API instances, impersonation state is lost on restart, permission caches are inconsistent, and dashboard metrics flicker.                                | **High**   | `dashboard-cache.service.ts:11`, `permission-cache.service.ts:11`, `impersonation.service.ts:20` |
| 3   | **`MaintenanceService.getStatus()` caches forever with no TTL** — Line 83: `if (this.cachedStatus) return this.cachedStatus`. Once cached, the status never refreshes unless `enable()` or `disable()` is explicitly called on the same instance. In a multi-instance deployment, maintenance mode changes won't propagate. | **Medium** | `maintenance.service.ts:82-83`                                                                   |
| 4   | **`formatTimeAgo()` is duplicated** — Identical implementations in `AuditService` (line 284) and `AnalyticsController` (line 104). Copy-paste divergence is inevitable.                                                                                                                                                     | **Low**    | `audit.service.ts:284`, `analytics.controller.ts:104`                                            |
| 5   | **`dotenv` loaded twice** — `main.ts:4` calls `config()` manually, then `ConfigModule.forRoot()` loads it again. The second load wins, but this is confusing and redundant.                                                                                                                                                 | **Low**    | `main.ts:1-4`, `app.module.ts:27-31`                                                             |
| 6   | **`AdminService` is an empty class** (4 lines) — Registered as a provider in `AdminModule` but contains zero logic. Dead code that confuses readers.                                                                                                                                                                        | **Low**    | `admin.service.ts`                                                                               |
| 7   | **`data.ts` returns hardcoded mock data** — `getDashboardStats()` always returns `{ totalUsers: 1247, ... }`. This is either forgotten placeholder code or a landmine for the next developer.                                                                                                                               | **Low**    | `apps/web/src/lib/data.ts`                                                                       |
| 8   | **CSP in `proxy.ts` hardcodes `connect-src 'self' http://localhost:3001`** — This will break in production when the API URL changes.                                                                                                                                                                                        | **Medium** | `proxy.ts:38,70`                                                                                 |
| 9   | **`AnalyticsController` injects `PRISMA_CLIENT` directly** — Bypasses the service layer, mixing query logic into the controller. Violates separation of concerns.                                                                                                                                                           | **Medium** | `analytics.controller.ts:30`                                                                     |
| 10  | **Pervasive `any` types in controllers** — `req: any`, `query: any`, `body: any` appear in 30+ locations. This defeats TypeScript's type safety at the exact boundary where it matters most (HTTP input).                                                                                                                   | **Medium** | `user-admin.controller.ts`, `session-admin.controller.ts`, etc.                                  |
| 11  | **Inconsistent logger usage** — Some services use the custom Pino-based `LoggerService`, others use NestJS's built-in `Logger`. This creates two different log formats in production.                                                                                                                                       | **Low**    | Mixed across `apps/api/src`                                                                      |
| 12  | **Empty `catch {}` block** in maintenance middleware — If the DB is down, maintenance check silently fails open (allows requests through). Should at minimum log the error.                                                                                                                                                 | **Medium** | `maintenance.middleware.ts:37`                                                                   |

---

## 🔴 Critical Issues (Must Fix)

### 1. Access Token Cookie Set with `httpOnly: false`

- **Issue**: In `apps/web/src/actions/auth.ts:41`, the access token cookie is set with `httpOnly: false`, making it readable by JavaScript.
- **Location**: `apps/web/src/actions/auth.ts:40-46`
- **Why it's dangerous**: Any XSS vulnerability (including third-party script injection) can steal the JWT via `document.cookie`. The attacker gets full API access for 15 minutes.
- **Recommended Fix**:
  1. Set `httpOnly: true` on the access token cookie
  2. The API already reads the token from cookies via `serverApiClient`, so the client-side `token-store.ts` reading `document.cookie` is the real problem — refactor to use server actions exclusively for authenticated requests
  3. Add `secure: true` and `sameSite: 'strict'` in production
- **Effort**: Medium (requires refactoring the client-side API client to not depend on reading the cookie from JS)

### 2. Frontend Middleware (`proxy.ts`) Is Never Wired Up

- **Issue**: `proxy.ts` exports a `proxy()` function and a `config.matcher`, but **there is no `middleware.ts` file** in the `apps/web` root. Next.js requires the middleware to be in a file named exactly `middleware.ts` at the project root.
- **Location**: `apps/web/proxy.ts` — should be `apps/web/middleware.ts`
- **Why it's dangerous**: ALL the route protection logic (redirecting unauthenticated users from `/dashboard`, blocking non-admins from `/admin/*`, security headers, CSP) is **completely inactive**. Any user can navigate to `/admin/users` by typing the URL directly. The layout-level checks in `admin/layout.tsx` provide a second layer, but they only redirect — they don't set security headers.
- **Recommended Fix**:
  1. Rename `proxy.ts` → `middleware.ts` (or create `middleware.ts` that imports from `proxy.ts`)
  2. Verify the middleware runs correctly in both dev and production
  3. Add integration tests for middleware routing logic
- **Effort**: Low (rename file + verify)

### 3. Client-Side Cookie Trusted for Authorization Decisions

- **Issue**: `proxy.ts:64` reads `user_role` from a cookie and uses it to redirect non-admin users. But this cookie is set with **no `httpOnly`** and **no integrity protection** — the client can change `user_role=ADMIN` in DevTools and bypass the frontend redirect.
- **Location**: `proxy.ts:56-66`, `actions/auth.ts:56-58`
- **Why it's dangerous**: While the API has its own server-side guards (which is the real security boundary), this creates a false sense of security. Admin UI components will render for unauthorized users, potentially leaking sensitive UI structure, and the admin layout's server-side check (`layout.tsx:13`) becomes the only real guard.
- **Recommended Fix**:
  1. Never trust client-side cookies for authorization — the middleware should validate the JWT server-side or call the API to verify the role
  2. Alternatively, encode the role in a signed/encrypted cookie
  3. At minimum, set `httpOnly: true` on role cookies so they can't be tampered via JS
- **Effort**: Medium

### 4. `getPeakActivityHour()` and `getActiveTenantsToday()` Load Entire Tables Into Memory

- **Issue**: `metrics-aggregation.service.ts:196-224` fetches ALL audit logs for today into Node.js memory, then processes them in a JS loop. `getActiveTenantsToday()` does the same with `distinct` then `.filter()`.
- **Location**: `metrics-aggregation.service.ts:194-225`
- **Why it's dangerous**: With 100K+ audit logs per day (realistic for a busy SaaS), this will consume hundreds of MB of RAM per request, cause GC pauses, and potentially OOM the process. This endpoint is called on every dashboard load.
- **Recommended Fix**:
  1. Replace `getPeakActivityHour()` with a SQL `DATE_TRUNC('hour', "createdAt")` + `GROUP BY` + `ORDER BY count DESC LIMIT 1` query
  2. Replace `getActiveTenantsToday()` with `COUNT(DISTINCT "tenantId")` in a single SQL query
  3. Both can be done via Prisma's `$queryRaw` or by restructuring the queries
- **Effort**: Low

### 5. No CSRF Protection

- **Issue**: The app uses cookie-based authentication with `credentials: 'include'` but has no CSRF token mechanism. The `sameSite: 'lax'` setting provides partial protection, but it's not sufficient for all attack vectors (e.g., GET-based CSRF, or if `sameSite` is ever relaxed).
- **Location**: Architecture-wide — `authenticated-api-client.ts`, `server-api-client.ts`, `auth.ts`
- **Why it's dangerous**: An attacker can craft a malicious page that submits forms to the API on behalf of an authenticated user. While `sameSite: 'lax'` mitigates the most common POST-based CSRF, it doesn't protect against all scenarios.
- **Recommended Fix**:
  1. Add a CSRF token endpoint (`/api/v1/csrf-token`) that returns a signed token
  2. Include the token in a custom header (`X-CSRF-Token`) for all state-changing requests
  3. Validate the token in a global NestJS guard
- **Effort**: Medium

---

## 📊 Architecture Scorecard

| Pillar                      | Score | Key Weakness                                                                                                           |
| --------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| Modularity & Coupling       | 🟡    | 12+ `forwardRef` circular dependencies between modules; empty ghost services; controller bypassing service layer       |
| Scalability & Performance   | 🔴    | In-memory caches break horizontally; dashboard analytics load entire tables into memory; no streaming for exports      |
| Maintainability & DX        | 🟢    | Excellent shared schema strategy, consistent structure, strong TypeScript usage (marred by `any` leaks in controllers) |
| Security & Robustness       | 🔴    | `httpOnly: false` on JWT cookie; middleware not wired up; client cookies trusted for auth; no CSRF protection          |
| Testability & Observability | 🟢    | Comprehensive test suite (unit + e2e + testcontainers), structured Pino logging with trace IDs, health checks          |

---

## 🎯 Action Plan (Priority Order)

1. **Wire up `middleware.ts`** — Rename `proxy.ts` to `middleware.ts` or create a proper middleware file. This is a 5-minute fix that activates all the route protection logic. — **Effort**: Low — **Impact**: Critical
2. **Set `httpOnly: true` on access token cookie** — Refactor the client-side API client to use server actions instead of reading cookies from JavaScript. — **Effort**: Medium — **Impact**: Critical
3. **Stop trusting `user_role` cookie for authorization** — Either sign the cookie, validate server-side, or remove the role from cookies entirely and verify via API. — **Effort**: Medium — **Impact**: Critical
4. **Fix `getPeakActivityHour()` and `getActiveTenantsToday()` to use SQL aggregation** — Replace in-memory JS processing with proper SQL `GROUP BY` / `COUNT(DISTINCT)`. — **Effort**: Low — **Impact**: High
5. **Add CSRF protection** — Implement a double-submit cookie or token-based CSRF defense. — **Effort**: Medium — **Impact**: High
6. **Replace in-memory caches with Redis** — Extract `DashboardCacheService`, `PermissionCacheService`, and `ImpersonationService` to use Redis (or similar) for horizontal scaling. — **Effort**: High — **Impact**: High
7. **Resolve `forwardRef` circular dependencies** — Restructure module boundaries. Extract `AuditService` into a shared `CoreModule` that both `AuthModule` and `AdminModule` import without circularity. — **Effort**: High — **Impact**: Medium
8. **Eliminate `any` types from controllers** — Use proper DTO types or `@repo/shared` inferred types for all `@Body()`, `@Query()`, and `@Req()` parameters. — **Effort**: Medium — **Impact**: Medium
9. **Add TTL to `MaintenanceService.getStatus()` cache** — A simple 30-second TTL prevents stale state in multi-instance deployments. — **Effort**: Low — **Impact**: Medium
10. **Remove dead code** — Delete empty `AdminService`, hardcoded `data.ts`, and consolidate duplicated `formatTimeAgo()`. — **Effort**: Low — **Impact**: Low

---

## ❓ Open Questions

1. **Is `proxy.ts` intentionally not wired up, or was it simply forgotten?** The file has a complete `config.matcher` export and sophisticated routing logic, suggesting it was meant to be active.

2. **What's the deployment topology?** If this runs as a single instance, the in-memory caches are tolerable (though still fragile on restart). If it's meant to scale horizontally, Redis is non-negotiable.

3. **Is the `user_role` cookie meant to be a convenience hint for UI rendering, or an authorization mechanism?** If the former, it should be clearly documented as untrusted. If the latter, it needs cryptographic protection.

4. **Why is `@repo/database` exporting raw source (`./src/index.ts`) while `@repo/shared` exports compiled output (`./dist/index.js`)?** This inconsistency means the database package relies on the consumer's TypeScript/bundler configuration, while shared is properly built.

5. **What's the expected audit log volume?** The `exportLogs` method loads everything into memory. If the answer is "millions of rows," this needs streaming (e.g., `prisma.$queryRaw` with a readable stream).

6. **Is the `IpAllowlistService` default-allow behavior (empty list = allow all) intentional?** For a security control, this is a dangerous default. Should it be default-deny with an explicit "disable allowlist" flag?
