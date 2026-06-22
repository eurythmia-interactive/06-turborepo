# 06-TUrborepo — Full-Stack Monorepo

A production-ready monorepo built with **Turborepo 2.9**, **pnpm 11**, **Next.js 16**, and **NestJS 11** featuring shared validation, secure authentication, RBAC, multi-tenancy, an admin dashboard, and comprehensive testing.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Database](#database)
- [Authentication & Authorization](#authentication--authorization)
- [Admin Dashboard](#admin-dashboard)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Known Issues](#known-issues)
- [Contributing](#contributing)

---

## Overview

This monorepo provides a complete full-stack application with:

- **Backend**: NestJS 11 API with JWT authentication, RBAC (21 permissions), multi-tenancy, and email service
- **Frontend**: Next.js 16 dashboard with React 19, Tailwind CSS v4, shadcn/ui components, and server actions
- **Admin Dashboard**: Full admin panel with user/tenant/role management, maintenance mode, impersonation, invitations, IP allowlist, audit logs, sessions, and analytics
- **Database**: PostgreSQL 16 with Prisma 7 ORM (14 models)
- **Shared**: Type-safe validation contracts using Zod 4 (11 admin schemas)
- **Testing**: 462+ tests with Vitest, React Testing Library, MSW, and E2E coverage
- **CI/CD**: GitHub Actions with automated testing and Docker builds

---

## Tech Stack

### Core Tooling

| Tool           | Version | Purpose                |
| -------------- | ------- | ---------------------- |
| **Node.js**    | ≥22.0.0 | Runtime                |
| **pnpm**       | 11.7.0  | Package manager        |
| **Turborepo**  | 2.9.18  | Monorepo orchestration |
| **TypeScript** | 5.9.3   | Type safety            |

### Backend (apps/api)

| Tool           | Version | Purpose          |
| -------------- | ------- | ---------------- |
| **NestJS**     | 11.1.27 | API framework    |
| **Prisma**     | 7.8.0   | ORM              |
| **PostgreSQL** | 16      | Database         |
| **JWT**        | —       | Authentication   |
| **Argon2**     | 0.44.0  | Password hashing |
| **Helmet**     | 8.2.0   | Security headers |
| **Resend**     | 6.14.0  | Email delivery   |

### Frontend (apps/web)

| Tool                | Version | Purpose             |
| ------------------- | ------- | ------------------- |
| **Next.js**         | 16.2.9  | React framework     |
| **React**           | 19.2.7  | UI library          |
| **Tailwind CSS**    | 4.3.1   | Styling             |
| **React Hook Form** | 7.79.0  | Form management     |
| **TanStack Table**  | 8.21.3  | Data tables         |
| **Recharts**        | 3.8.1   | Charts              |
| **Lucide React**    | 1.20.0  | Icons               |
| **Sonner**          | 2.0.7   | Toast notifications |
| **shadcn/ui**       | —       | Component library   |

### Shared Packages

| Tool         | Version | Purpose            |
| ------------ | ------- | ------------------ |
| **Zod**      | 4.4.3   | Validation schemas |
| **ESLint**   | 9.39.1  | Code linting       |
| **Prettier** | 3.8.4   | Code formatting    |
| **Oxlint**   | 1.70.0  | Fast linting       |

### Testing

| Tool                      | Version | Purpose         |
| ------------------------- | ------- | --------------- |
| **Vitest**                | 4.1.9   | Test runner     |
| **React Testing Library** | 16.3.2  | Component tests |
| **MSW**                   | 2.14.6  | API mocking     |
| **Supertest**             | 7.2.2   | E2E testing     |
| **Testcontainers**        | 12.0.2  | Test database   |

---

## Project Structure

```
.
├── apps/
│   ├── api/                          # NestJS 11 backend
│   │   ├── src/
│   │   │   ├── admin/                # Admin module
│   │   │   │   ├── admin.controller.ts
│   │   │   │   ├── admin.module.ts
│   │   │   │   ├── analytics/        # Dashboard metrics, growth, activity
│   │   │   │   ├── audit/            # Audit log CRUD + export
│   │   │   │   ├── controllers/      # IP allowlist controller
│   │   │   │   ├── guards/           # IP allowlist guard
│   │   │   │   ├── impersonation/    # User impersonation
│   │   │   │   ├── invitation/       # Invitation management
│   │   │   │   ├── role/             # Role CRUD + permissions
│   │   │   │   ├── services/         # IP allowlist service
│   │   │   │   ├── session/          # Session management
│   │   │   │   ├── system/           # Maintenance mode (service, controller, middleware)
│   │   │   │   ├── tenant/           # Tenant CRUD + stats
│   │   │   │   └── user/             # User CRUD + bulk ops
│   │   │   ├── auth/                 # JWT auth, guards, token refresh
│   │   │   ├── common/
│   │   │   │   └── email/            # Resend email service + templates
│   │   │   ├── config/               # Environment validation (Zod)
│   │   │   ├── database/             # Prisma client injection
│   │   │   ├── health/               # Health check
│   │   │   ├── invitation/           # Public invitation accept
│   │   │   ├── tenant/               # Public tenant endpoints
│   │   │   ├── user/                 # Public user endpoints
│   │   │   └── main.ts               # Bootstrap (helmet, middleware, CORS)
│   │   ├── test/
│   │   │   ├── e2e/                  # E2E tests (maintenance, impersonation, invitation)
│   │   │   └── helpers/              # Test DB, fixtures, test app
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                          # Next.js 16 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── admin/            # Admin dashboard pages
│       │   │   │   ├── audit/        # Audit logs
│       │   │   │   ├── invitations/  # Invitation management
│       │   │   │   ├── login/        # Admin login
│       │   │   │   ├── roles/        # Role management
│       │   │   │   │   └── [id]/edit/
│       │   │   │   ├── sessions/     # Session management
│       │   │   │   ├── settings/     # System settings
│       │   │   │   ├── tenants/      # Tenant management
│       │   │   │   │   └── [id]/
│       │   │   │   ├── users/        # User management
│       │   │   │   │   └── [id]/
│       │   │   │   └── page.tsx      # Dashboard
│       │   │   ├── invite/
│       │   │   │   └── [token]/      # Public invitation accept
│       │   │   └── maintenance/      # Public maintenance page
│       │   ├── actions/              # 13 server action files
│       │   │   ├── audit.ts
│       │   │   ├── auth.ts
│       │   │   ├── dashboard.ts
│       │   │   ├── impersonation.ts
│       │   │   ├── invitations.ts
│       │   │   ├── maintenance.ts
│       │   │   ├── profile.ts
│       │   │   ├── register.ts
│       │   │   ├── roles.ts
│       │   │   ├── sessions.ts
│       │   │   ├── system.ts          # IP allowlist actions
│       │   │   ├── tenants.ts
│       │   │   └── users.ts
│       │   ├── components/
│       │   │   ├── admin/            # 32 admin components
│       │   │   │   ├── charts/       # Tenant activity, user growth charts
│       │   │   │   ├── settings-panel.tsx
│       │   │   │   ├── maintenance-toggle.tsx
│       │   │   │   ├── impersonation-banner.tsx
│       │   │   │   ├── dashboard-client.tsx
│       │   │   │   └── ...           # Lists, dialogs, actions for all entities
│       │   │   ├── forms/            # Login, register, profile forms
│       │   │   └── ui/               # shadcn/ui components
│       │   ├── lib/                  # API clients, session, mock data
│       │   ├── mocks/                # MSW handlers
│       │   └── providers/            # Context providers
│       ├── next.config.ts            # transpilePackages, webpack extensionAlias
│       ├── proxy.ts                  # Route protection middleware
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared validation contracts
│   │   └── src/
│   │       ├── auth/                 # Login, register, profile schemas
│   │       ├── admin/                # 11 admin schema files
│   │       │   ├── audit.schema.ts
│   │       │   ├── dashboard.schema.ts
│   │       │   ├── invitation.schema.ts
│   │       │   ├── password.schema.ts
│   │       │   ├── permissions.ts    # 21 permissions, role mappings
│   │       │   ├── role.schema.ts
│   │       │   ├── session.schema.ts
│   │       │   ├── system.schema.ts
│   │       │   ├── tenant.schema.ts
│   │       │   └── user.schema.ts
│   │       └── index.ts              # Unified barrel exports
│   │
│   ├── database/                     # Prisma schema + client
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # 14 models, 4 enums
│   │   │   └── seed.ts
│   │   └── src/
│   │
│   ├── config-eslint/                # ESLint 9 flat config
│   └── config-typescript/            # Shared TypeScript configs
│
├── .github/
│   └── workflows/ci.yml              # GitHub Actions CI/CD
│
├── reports/                          # Session reports (Dashboard-summary-*.md)
├── docker-compose.yml                # PostgreSQL + dev services
├── turbo.json                        # Turborepo pipeline
├── pnpm-workspace.yaml               # pnpm workspace config
└── package.json                      # Root scripts + devDependencies
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥22.0.0
- **pnpm** 11.7.0 (via Corepack)
- **Docker** and **Docker Compose** (for database)
- **Git**

### 1. Clone and Install

```bash
git clone <repository-url>
cd 06-TUrborepo

corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

**Required variables:**

```env
# Database
DATABASE_URL=postgresql://dev:dev@localhost:5432/app_dev
POSTGRES_USER=dev
POSTGRES_PASSWORD=dev
POSTGRES_DB=app_dev

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN_ACCESS=15m
JWT_EXPIRES_IN_REFRESH=7d

# CORS
CORS_ORIGINS=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@example.com
WEB_URL=http://localhost:3000
```

### 3. Start Database

```bash
docker compose --profile dev up -d
```

### 4. Migrate and Seed

```bash
pnpm --filter @repo/database db:migrate
pnpm --filter @repo/database db:seed
```

This creates:

- **Super Admin**: `admin@example.com` / `Admin123!`
- **Member**: `member@example.com` / `Member123!`

### 5. Start Development

```bash
pnpm dev
```

| Service           | URL                         |
| ----------------- | --------------------------- |
| **Web (Next.js)** | http://localhost:3000       |
| **Admin Panel**   | http://localhost:3000/admin |
| **API (NestJS)**  | http://localhost:3001       |
| **Prisma Studio** | http://localhost:5555       |

---

## Development Workflow

### Common Commands

```bash
# Development
pnpm dev                        # Start all apps in dev mode
pnpm --filter @apps/web dev     # Start only web
pnpm --filter @apps/api dev     # Start only API

# Build
pnpm build                      # Build all packages
pnpm --filter @apps/web build   # Build only web
pnpm --filter @apps/api build   # Build only API

# Lint & Format
pnpm lint                       # ESLint all packages
pnpm lint:ox                    # Oxlint fast lint
pnpm format:check               # Check formatting
pnpm format                     # Fix formatting

# Test
pnpm test                       # Run all tests
pnpm --filter @apps/api test    # API tests
pnpm --filter @apps/web test    # Web tests

# Database
pnpm db:up                      # Start PostgreSQL
pnpm db:studio                  # Open Prisma Studio
pnpm --filter @repo/database db:migrate        # Create migration
pnpm --filter @repo/database db:migrate:deploy # Apply migrations
pnpm --filter @repo/database db:seed           # Seed database
pnpm --filter @repo/database db:generate       # Regenerate Prisma client

# Clean
pnpm clean                      # Remove build outputs and node_modules
```

### Git Hooks (Husky)

- **pre-commit**: Oxlint + Prettier on staged files
- **pre-push**: Full Turbo pipeline (build, lint, test)

---

## Database

### Models (14 total)

| #   | Model                      | Key Fields                                                                                               | Purpose                                             |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | **User**                   | `id`, `email` (unique), `name`, `status`, `role`, `customRoleId`, `isSystem`, `lastLoginAt`, `deletedAt` | User accounts                                       |
| 2   | **Tenant**                 | `id`, `name`, `slug` (unique), `plan`, `domain`, `suspended`, `isSystem`, `deletedAt`                    | Multi-tenant organizations                          |
| 3   | **UserTenant**             | `userId` + `tenantId` (composite PK), `role`, `customRoleId`                                             | Many-to-many user-tenant membership                 |
| 4   | **CustomRole**             | `id`, `name` (unique), `description`, `permissions[]`, `isSystem`                                        | Custom RBAC roles                                   |
| 5   | **AuthenticationProvider** | `id`, `userId`, `type` (LOCAL\|GITHUB\|GOOGLE), `providerUserId`, `passwordHash`                         | Auth method per user                                |
| 6   | **RefreshToken**           | `id`, `userId`, `tokenHash` (unique), `familyId`, `revoked`, `ip`, `userAgent`, `expiresAt`              | Token rotation with reuse detection                 |
| 7   | **AuditLog**               | `id`, `userId`, `tenantId`, `action`, `details` (JSON), `ip`, `userAgent`                                | Activity audit trail                                |
| 8   | **SystemConfig**           | `id`, `key` (unique), `value` (JSON), `description`, `updatedBy`                                         | Key-value system config (maintenance, IP allowlist) |
| 9   | **FeatureFlag**            | `id`, `key` (unique), `name`, `description`, `enabled`, `tenantId`                                       | Feature toggles                                     |
| 10  | **ApiKey**                 | `id`, `name`, `keyHash` (unique), `tenantId`, `permissions[]`, `expiresAt`, `revoked`                    | API key management                                  |
| 11  | **UserInvitation**         | `id`, `email`, `token` (unique), `tenantId`, `role`, `invitedBy`, `acceptedAt`, `expiresAt`              | Email invitations (7-day expiry)                    |
| 12  | **PasswordResetToken**     | `id`, `userId`, `token` (unique), `expiresAt`, `usedAt`                                                  | Password reset flow                                 |

### Enums (4)

| Enum               | Values                            |
| ------------------ | --------------------------------- |
| `UserStatus`       | ACTIVE, SUSPENDED, PENDING        |
| `Role`             | SUPER_ADMIN, ADMIN, MEMBER, GUEST |
| `AuthProviderType` | LOCAL, GITHUB, GOOGLE             |
| `Plan`             | free, pro, enterprise             |

---

## Authentication & Authorization

### Authentication Flow

1. **Register** → Create user with hashed password (argon2)
2. **Login** → Validate credentials → Issue access + refresh tokens
3. **Refresh** → Rotate refresh token (SHA-256 hashed) → New access token
4. **Logout** → Revoke refresh token → Clear cookie

### Token Architecture

| Token             | Type                  | Lifespan   | Storage              |
| ----------------- | --------------------- | ---------- | -------------------- |
| **Access Token**  | JWT (HS256 or RS256)  | 15 minutes | Authorization header |
| **Refresh Token** | Random + SHA-256 hash | 7 days     | httpOnly cookie      |

**Security Features:**

- Token rotation with reuse detection (family revocation)
- httpOnly, Secure, SameSite=Lax cookies
- Rate limiting on auth endpoints (5 req/min login, 3 req/min register)
- Password strength validation (8+ chars, mixed case, digits, special chars)

### Authorization (RBAC)

```typescript
// Role-based access
@Roles(Role.ADMIN)
@Get('admin-only')
async adminEndpoint() { ... }

// Permission-based access
@Permissions('user:write')
@Patch('users/:id')
async updateUser() { ... }

// Public routes (no authentication)
@Public()
@Get('health')
async healthCheck() { ... }

// Current user extraction
@Get('profile')
async getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
```

### Permission System (21 permissions, 5 categories)

| Category   | Permissions                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------- |
| **Tenant** | `tenant:read`, `tenant:write`, `tenant:delete`, `tenant:suspend`                                    |
| **User**   | `user:read`, `user:write`, `user:delete`, `user:suspend`, `user:reset-password`, `user:impersonate` |
| **Role**   | `role:read`, `role:write`, `role:delete`                                                            |
| **Admin**  | `admin:access`, `admin:settings`, `admin:feature-flags`, `admin:audit`, `admin:api-keys`            |
| **System** | `system:maintenance`, `system:backup`, `system:config`                                              |

**Role-to-Permission mapping:**

| Role            | Tenant      | User               | Role  | Admin             | System | Total |
| --------------- | ----------- | ------------------ | ----- | ----------------- | ------ | ----- |
| **SUPER_ADMIN** | All 4       | All 6              | All 3 | All 5             | All 3  | 21    |
| **ADMIN**       | All 4       | 5 (no impersonate) | All 3 | 2 (access, audit) | —      | 14    |
| **MEMBER**      | tenant:read | user:read          | —     | —                 | —      | 2     |
| **GUEST**       | —           | user:read          | —     | —                 | —      | 1     |

---

## Admin Dashboard

The admin dashboard (`/admin`) provides a full system management interface:

### Features

| Feature         | Description                                                | Route                |
| --------------- | ---------------------------------------------------------- | -------------------- |
| **Dashboard**   | Metrics cards, growth charts, activity feed, recent events | `/admin`             |
| **Users**       | CRUD, bulk operations, suspend/restore, role assignment    | `/admin/users`       |
| **Tenants**     | CRUD, suspend/restore, stats, plan management              | `/admin/tenants`     |
| **Roles**       | CRUD, permission matrix editor, system role protection     | `/admin/roles`       |
| **Audit Logs**  | Filterable log viewer, detail modal, CSV export            | `/admin/audit`       |
| **Sessions**    | Active session list, revoke individual/all                 | `/admin/sessions`    |
| **Invitations** | Create, resend, cancel invitations; status tracking        | `/admin/invitations` |
| **Settings**    | IP allowlist, maintenance mode toggle                      | `/admin/settings`    |

### Admin-Only Features

| Feature                | Description                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Maintenance Mode**   | Enable/disable site-wide maintenance with custom message and scheduled end time. Blocks non-admin traffic with 503 responses. SUPER_ADMIN bypass.            |
| **User Impersonation** | Support tool — admins can impersonate users (1-hour sessions). Audit logged. Cannot impersonate SUPER_ADMIN or self. Persistent banner with countdown timer. |
| **Email Invitations**  | Invite users by email via Resend. 7-day expiry. Public accept page at `/invite/[token]`. Auto-accept flow after registration.                                |
| **IP Allowlist**       | Restrict admin panel access to specific IP addresses. Empty list = all allowed.                                                                              |
| **Session Timeout**    | Warning banner when session is about to expire.                                                                                                              |

---

## API Endpoints

### Public Endpoints

| Method  | Path                                | Auth     | Description              |
| ------- | ----------------------------------- | -------- | ------------------------ |
| `GET`   | `/api/v1/health`                    | Public   | Health check             |
| `POST`  | `/api/v1/auth/register`             | Public   | User registration        |
| `POST`  | `/api/v1/auth/login`                | Public   | Login with credentials   |
| `POST`  | `/api/v1/auth/refresh`              | Public   | Refresh access token     |
| `POST`  | `/api/v1/auth/logout`               | Required | Logout and revoke token  |
| `GET`   | `/api/v1/auth/profile`              | Required | Get current user profile |
| `PATCH` | `/api/v1/auth/profile`              | Required | Update user profile      |
| `POST`  | `/api/v1/auth/select-tenant/:id`    | Required | Switch active tenant     |
| `GET`   | `/api/v1/invitations/:token`        | Public   | View invitation details  |
| `POST`  | `/api/v1/invitations/:token/accept` | Required | Accept invitation        |

### Admin Endpoints (`/api/v1/admin/*`)

| Method            | Path                                | Permission           | Description                        |
| ----------------- | ----------------------------------- | -------------------- | ---------------------------------- |
| **Users**         |                                     |                      |                                    |
| `GET`             | `/admin/users`                      | `user:read`          | List users (paginated, filterable) |
| `GET`             | `/admin/users/:id`                  | `user:read`          | Get user detail                    |
| `POST`            | `/admin/users`                      | `user:write`         | Create user                        |
| `PATCH`           | `/admin/users/:id`                  | `user:write`         | Update user                        |
| `DELETE`          | `/admin/users/:id`                  | `user:delete`        | Soft-delete user                   |
| `POST`            | `/admin/users/:id/suspend`          | `user:suspend`       | Suspend user                       |
| `POST`            | `/admin/users/:id/restore`          | `user:write`         | Restore user                       |
| `POST`            | `/admin/users/bulk`                 | `user:write`         | Bulk operations                    |
| `POST`            | `/admin/users/bulk/role`            | `user:write`         | Bulk role assignment               |
| **Tenants**       |                                     |                      |                                    |
| `GET`             | `/admin/tenants`                    | `tenant:read`        | List tenants                       |
| `GET`             | `/admin/tenants/:id`                | `tenant:read`        | Get tenant detail                  |
| `POST`            | `/admin/tenants`                    | `tenant:write`       | Create tenant                      |
| `PATCH`           | `/admin/tenants/:id`                | `tenant:write`       | Update tenant                      |
| `DELETE`          | `/admin/tenants/:id`                | `tenant:delete`      | Soft-delete tenant                 |
| `POST`            | `/admin/tenants/:id/suspend`        | `tenant:suspend`     | Suspend tenant                     |
| `POST`            | `/admin/tenants/:id/restore`        | `tenant:write`       | Restore tenant                     |
| `GET`             | `/admin/tenants/:id/stats`          | `tenant:read`        | Tenant statistics                  |
| **Roles**         |                                     |                      |                                    |
| `GET`             | `/admin/roles`                      | `role:read`          | List roles                         |
| `GET`             | `/admin/roles/:id`                  | `role:read`          | Get role detail                    |
| `POST`            | `/admin/roles`                      | `role:write`         | Create role                        |
| `PATCH`           | `/admin/roles/:id`                  | `role:write`         | Update role                        |
| `DELETE`          | `/admin/roles/:id`                  | `role:delete`        | Delete role                        |
| `POST`            | `/admin/roles/:id/permissions`      | `role:write`         | Assign permissions                 |
| **Audit**         |                                     |                      |                                    |
| `GET`             | `/admin/audit`                      | `admin:audit`        | List audit logs                    |
| `GET`             | `/admin/audit/:id`                  | `admin:audit`        | Get log detail                     |
| `GET`             | `/admin/audit/summary`              | `admin:audit`        | Audit summary                      |
| `GET`             | `/admin/audit/export`               | `admin:audit`        | Export audit logs                  |
| **Sessions**      |                                     |                      |                                    |
| `GET`             | `/admin/sessions`                   | `admin:access`       | List active sessions               |
| `POST`            | `/admin/sessions/:id/revoke`        | `admin:access`       | Revoke session                     |
| `POST`            | `/admin/sessions/revoke-all`        | `admin:access`       | Revoke all sessions                |
| **Invitations**   |                                     |                      |                                    |
| `GET`             | `/admin/invitations`                | `admin:access`       | List invitations                   |
| `POST`            | `/admin/invitations`                | `admin:access`       | Create invitation                  |
| `POST`            | `/admin/invitations/:id/resend`     | `admin:access`       | Resend invitation                  |
| `POST`            | `/admin/invitations/:id/cancel`     | `admin:access`       | Cancel invitation                  |
| **Dashboard**     |                                     |                      |                                    |
| `GET`             | `/admin/dashboard/metrics`          | `admin:access`       | Dashboard metrics                  |
| `GET`             | `/admin/dashboard/growth`           | `admin:access`       | Growth data                        |
| `GET`             | `/admin/dashboard/activity`         | `admin:access`       | Activity data                      |
| `GET`             | `/admin/dashboard/recent`           | `admin:access`       | Recent activity                    |
| **Impersonation** |                                     |                      |                                    |
| `POST`            | `/admin/impersonation/start`        | `user:impersonate`   | Start impersonating                |
| `POST`            | `/admin/impersonation/stop`         | `user:impersonate`   | Stop impersonating                 |
| `GET`             | `/admin/impersonation/status`       | Required             | Get impersonation status           |
| **System**        |                                     |                      |                                    |
| `GET`             | `/admin/system/maintenance/status`  | Required             | Maintenance status                 |
| `POST`            | `/admin/system/maintenance/enable`  | `system:maintenance` | Enable maintenance                 |
| `POST`            | `/admin/system/maintenance/disable` | `system:maintenance` | Disable maintenance                |
| **IP Allowlist**  |                                     |                      |                                    |
| `GET`             | `/admin/ip-allowlist`               | `admin:settings`     | List allowed IPs                   |
| `POST`            | `/admin/ip-allowlist`               | `admin:settings`     | Add IP                             |
| `DELETE`          | `/admin/ip-allowlist/:ip`           | `admin:settings`     | Remove IP                          |

---

## Testing

### Test Structure

```
apps/api/
├── test/
│   ├── e2e/                      # E2E tests (maintenance, impersonation, invitation)
│   ├── helpers/                  # Test database, app bootstrap, fixtures
│   └── database.module.spec.ts
└── src/
    └── **/*.spec.ts              # 28 unit test files

apps/web/
└── src/
    ├── __tests__/
    │   └── components/           # Component tests (profile form, etc.)
    ├── actions/
    │   └── *.test.ts             # 7 server action test files
    └── components/
        └── admin/
            └── *.test.tsx        # 13 component test files

packages/shared/
└── src/
    └── **/*.test.ts              # 4 shared schema test files
```

### Test Commands

```bash
# Run all tests
pnpm test

# By package
pnpm --filter @apps/api test         # Backend unit tests
pnpm --filter @apps/api test:e2e     # Backend E2E tests
pnpm --filter @apps/web test         # Frontend tests
pnpm --filter @repo/shared test      # Shared schema tests

# Watch mode
pnpm --filter @apps/web test:watch
pnpm --filter @repo/shared test:watch
```

### Test Coverage

| Package   | Tests   | Status             |
| --------- | ------- | ------------------ |
| Backend   | 321     | ✅ Passing         |
| Frontend  | 141     | ✅ Passing         |
| **Total** | **462** | ✅ **All Passing** |

### Test Stack

- **Vitest 4** — Fast test runner with ESM support
- **React Testing Library** — Component tests with user-centric API
- **MSW 2** — Network-level API mocking for frontend tests
- **Supertest** — HTTP assertion library for E2E tests
- **Testcontainers** — Ephemeral PostgreSQL for integration tests

---

## CI/CD

### GitHub Actions Workflow (`ci.yml`)

**Pipeline Stages:**

1. **Setup** — Checkout, pnpm install, cache
2. **Format Check** — Prettier verification
3. **Lint** — ESLint + Oxlint
4. **Build** — TypeScript compilation across all packages
5. **Test** — Run unit tests
6. **Database Migration** — Apply Prisma migrations to test DB
7. **E2E Tests** — API E2E tests with PostgreSQL service container
8. **Web Tests** — Frontend tests with jsdom

**Test Database Service:**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: turborepo
      POSTGRES_PASSWORD: turborepo
      POSTGRES_DB: turborepo_test
    ports: ['5432:5432']
    options: --health-cmd pg_isready --health-interval 10s
```

---

## Docker Deployment

### Production Builds

**API Dockerfile** (`apps/api/Dockerfile`):

- Multi-stage build with `node:22-alpine`
- Non-root user (`nestjs`)
- Production dependencies only
- Exposes port 3001

**Web Dockerfile** (`apps/web/Dockerfile`):

- Multi-stage build with standalone output
- Non-root user (`nextjs`)
- Exposes port 3000

### Build Commands

```bash
# Build Docker images
docker build -t api -f apps/api/Dockerfile .
docker build -t web -f apps/web/Dockerfile .

# Run containers
docker run -p 3001:3001 api
docker run -p 3000:3000 web
```

---

## Environment Variables

### Root `.env`

| Variable                 | Required | Default                 | Description                            |
| ------------------------ | -------- | ----------------------- | -------------------------------------- |
| `DATABASE_URL`           | ✅       | —                       | PostgreSQL connection string           |
| `POSTGRES_USER`          | ✅       | `dev`                   | Database user                          |
| `POSTGRES_PASSWORD`      | ✅       | `dev`                   | Database password                      |
| `POSTGRES_DB`            | ✅       | `app_dev`               | Database name                          |
| `JWT_SECRET`             | ✅       | —                       | JWT signing key (min 32 chars)         |
| `JWT_PRIVATE_KEY`        | ❌       | —                       | RSA private key (base64, for RS256)    |
| `JWT_PUBLIC_KEY`         | ❌       | —                       | RSA public key (base64, for RS256)     |
| `JWT_EXPIRES_IN_ACCESS`  | ❌       | `15m`                   | Access token lifetime                  |
| `JWT_EXPIRES_IN_REFRESH` | ❌       | `7d`                    | Refresh token lifetime                 |
| `CORS_ORIGINS`           | ✅       | —                       | Comma-separated allowed origins        |
| `COOKIE_SECURE`          | ❌       | `false`                 | Secure cookie flag                     |
| `THROTTLE_TTL`           | ❌       | `60000`                 | Rate limit time window (ms)            |
| `THROTTLE_LIMIT`         | ❌       | `10`                    | Requests per window                    |
| `RESEND_API_KEY`         | ❌       | —                       | Resend API key (falls back to console) |
| `EMAIL_FROM`             | ❌       | `noreply@example.com`   | Sender email address                   |
| `WEB_URL`                | ❌       | `http://localhost:3000` | Web app URL (for email links)          |
| `NODE_ENV`               | ❌       | `development`           | Environment                            |
| `PORT`                   | ❌       | `3001`                  | API port                               |

### Web `.env.local` (Client-side)

| Variable              | Required | Default                 | Description  |
| --------------------- | -------- | ----------------------- | ------------ |
| `NEXT_PUBLIC_API_URL` | ✅       | `http://localhost:3001` | API base URL |

---

## Known Issues

### `transpilePackages` Required for `@repo/shared`

Next.js (Webpack mode) does not follow workspace package re-exports correctly by default. Add `transpilePackages` to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  transpilePackages: ['@repo/shared'],
  // ...
};
```

### Webpack Re-export Chain (Value Exports)

Value exports through the barrel `index.ts` in `@repo/shared` (e.g., `PLAN_VALUES`) may resolve as `undefined` in client bundles. **Workaround:** inline simple constants directly in client components rather than importing through the barrel.

### Turbopack Incompatibility

Turbopack does not support Webpack's `extensionAlias` configuration. Use the `--webpack` flag in development:

```bash
pnpm --filter @apps/web dev     # Uses webpack (configured in package.json scripts)
```

---

## Contributing

### Development Guidelines

1. **Branch naming**: `feature/`, `fix/`, `chore/`
2. **Commit messages**: Conventional commits
3. **Code style**: Prettier + ESLint (Oxlint for pre-flight)
4. **Type safety**: Strict TypeScript, avoid `any`

### Prerequisites Before PR

```bash
pnpm format                     # Format code
pnpm lint                       # Fix lint issues
pnpm build                      # Ensure build passes
pnpm test                       # Run all tests
```

### Adding New Workspaces

1. Create directory in `apps/` or `packages/`
2. Add `package.json` with `name` and `version`
3. Update `pnpm-workspace.yaml` if needed
4. Add `tsconfig.json` extending shared config
5. Register tasks in `turbo.json`

### Adding Dependencies

```bash
pnpm --filter @apps/web add package-name     # To a specific workspace
pnpm add -w package-name                     # To root
pnpm add -D package-name                     # Dev dependency
```

---

## Troubleshooting

### Common Issues

**1. `EADDRINUSE` on port 3000/3001**

```bash
fuser -k 3000/tcp 3001/tcp
```

**2. `DATABASE_URL` not found**

```bash
source .env
# Or use dotenv-cli:
pnpm exec dotenv -e ../../.env -- pnpm db:migrate
```

**3. Prisma client generation fails**

```bash
pnpm --filter @repo/database db:generate
echo $DATABASE_URL  # Verify it's set
```

**4. TypeScript import errors**

Imports in `@repo/shared` use `.js` extensions (required for ESM output):

```typescript
// ✅ Correct
export { loginSchema } from './auth/login.schema.js';

// ❌ Incorrect
export { loginSchema } from './auth/login.schema';
```

**5. Next.js build fails with Turbopack**

```bash
# Use webpack mode (already set in package.json scripts)
pnpm --filter @apps/web dev     # Runs: next dev --webpack --port 3000
pnpm --filter @apps/web build   # Runs: next build --webpack
```

---

## License

This project is private and proprietary. All rights reserved.

---

## Acknowledgments

Built with:

- [Turborepo](https://turbo.build/) — Build system
- [Next.js](https://nextjs.org/) — React framework
- [NestJS](https://nestjs.com/) — Progressive Node.js framework
- [Prisma](https://www.prisma.io/) — Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) — Re-usable components
- [Resend](https://resend.com/) — Email delivery
- [Zod](https://zod.dev/) — TypeScript-first validation
