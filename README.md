# Turborepo Monorepo — Full-Stack Application

A production-ready monorepo built with **Turborepo**, **pnpm**, **Next.js 16**, and **NestJS 11** featuring shared validation, secure authentication, RBAC, multi-tenancy, and comprehensive testing.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Database](#database)
- [Authentication & Authorization](#authentication--authorization)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This monorepo provides a complete full-stack application with:

- **Backend**: NestJS 11 API with JWT authentication, RBAC, and multi-tenancy
- **Frontend**: Next.js 16 dashboard with React 19, Tailwind v4, and shadcn/ui
- **Database**: PostgreSQL 16 with Prisma 7 ORM
- **Shared**: Type-safe validation contracts using Zod 4
- **Testing**: 347+ tests with Vitest, React Testing Library, and E2E coverage
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
| **Argon2**     | 0.41.1  | Password hashing |

### Frontend (apps/web)

| Tool                | Version | Purpose           |
| ------------------- | ------- | ----------------- |
| **Next.js**         | 16.2.9  | React framework   |
| **React**           | 19.2.7  | UI library        |
| **Tailwind CSS**    | v4      | Styling           |
| **React Hook Form** | 7.54.2  | Form management   |
| **shadcn/ui**       | —       | Component library |

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
| **Supertest**             | 7.1.0   | E2E testing     |
| **Testcontainers**        | 12.0.2  | Test database   |

---

## Project Structure

```
.
├── apps/
│   ├── api/                    # NestJS backend application
│   │   ├── src/
│   │   │   ├── auth/           # Authentication module (JWT, guards)
│   │   │   ├── common/         # Shared pipes, filters, interceptors
│   │   │   ├── config/         # Environment validation
│   │   │   ├── database/       # Prisma client injection
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── tenant/         # Multi-tenant management
│   │   │   └── user/           # User management
│   │   ├── test/               # E2E and integration tests
│   │   ├── Dockerfile          # Multi-stage production build
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend application
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   │   ├── (auth)/     # Login/Register pages
│       │   │   └── dashboard/  # Protected dashboard
│       │   ├── actions/        # Server actions
│       │   ├── components/     # React components
│       │   │   ├── forms/      # Form components with validation
│       │   │   ├── layout/     # Layout primitives
│       │   │   └── ui/         # shadcn/ui components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # API clients, session, utilities
│       │   └── providers/      # Context providers
│       ├── proxy.ts            # Route protection middleware
│       ├── Dockerfile          # Multi-stage production build
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared validation contracts
│   │   └── src/
│   │       ├── auth/           # Zod schemas (login, register, profile)
│   │       └── index.ts        # Unified exports
│   │
│   ├── database/               # Prisma schema and client
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database models
│   │   │   └── seed.ts         # Seed script
│   │   └── src/                # Prisma client wrapper
│   │
│   ├── config-eslint/          # ESLint 9 flat config
│   └── config-typescript/      # Shared TypeScript configs
│
├── .github/
│   └── workflows/ci.yml        # GitHub Actions CI/CD
│
├── docker-compose.yml          # PostgreSQL + dev services
├── turbo.json                  # Turborepo pipeline
├── pnpm-workspace.yaml         # pnpm workspace config
├── package.json                # Root dependencies
└── README.md                   # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥22.0.0
- **pnpm** 11.7.0 (Corepack enabled)
- **Docker** and **Docker Compose** (for database)
- **Git** (for version control)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-root>
```

### 2. Install Dependencies

```bash
corepack enable
pnpm install
```

> **Note:** pnpm will auto-install the correct version defined in `packageManager` field.

### 3. Set Up Environment Variables

Create `.env` files in the root and packages:

```bash
# Root .env
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
JWT_SECRET=your-secret-key  # Use a secure key in production
JWT_EXPIRES_IN_ACCESS=15m
JWT_EXPIRES_IN_REFRESH=7d

# CORS
CORS_ORIGINS=http://localhost:3000

# Optional: RSA for production
# JWT_PRIVATE_KEY=base64-encoded-private-key
# JWT_PUBLIC_KEY=base64-encoded-public-key
```

### 4. Start PostgreSQL

```bash
docker compose --profile dev up -d
```

### 5. Run Database Migrations

```bash
pnpm --filter @repo/database db:migrate
```

### 6. Seed the Database

```bash
pnpm --filter @repo/database db:seed
```

This creates:

- **Admin user**: `admin@example.com` / `Admin123!`
- **Member user**: `member@example.com` / `Member123!`

### 7. Start Development Servers

```bash
pnpm dev
```

- **Web**: http://localhost:3000
- **API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555

---

## Development Workflow

### Common Commands

```bash
# Development
pnpm dev                      # Start all apps in dev mode
pnpm --filter @apps/web dev   # Start only web
pnpm --filter @apps/api dev   # Start only API

# Build
pnpm build                    # Build all packages
pnpm --filter @apps/web build # Build only web
pnpm --filter @apps/api build # Build only API

# Lint & Format
pnpm lint                     # ESLint all packages
pnpm lint:ox                  # Oxlint fast lint
pnpm format:check             # Check formatting
pnpm format:write             # Fix formatting

# Test
pnpm test                     # Run all tests
pnpm --filter @apps/api test  # API tests
pnpm --filter @apps/web test  # Web tests
pnpm test:coverage            # Generate coverage reports

# Database
pnpm --filter @repo/database db:studio         # Open Prisma Studio
pnpm --filter @repo/database db:migrate        # Run migrations
pnpm --filter @repo/database db:migrate:deploy # CI migrations
pnpm --filter @repo/database db:seed           # Seed database
```

### Git Hooks

- **pre-commit**: Runs Oxlint + Prettier on staged files
- **pre-push**: Runs full Turbo pipeline (build, lint, test)

---

## Database

### Schema Overview

```prisma
model User {
  id                      String                   @id @default(uuid())
  email                   String                   @unique
  name                    String?
  image                   String?
  status                  UserStatus               @default(ACTIVE)
  role                    Role                     @default(MEMBER)
  authenticationProviders AuthenticationProvider[]
  refreshTokens           RefreshToken[]
  userTenants             UserTenant[]
  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt
}

model Tenant {
  id          String       @id @default(uuid())
  name        String
  slug        String       @unique
  users       UserTenant[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model UserTenant {
  userId    String
  tenantId  String
  user      User     @relation(fields: [userId], references: [id])
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  joinedAt  DateTime @default(now())
  @@id([userId, tenantId])
}

model AuthenticationProvider {
  id            String             @id @default(uuid())
  userId        String
  provider      AuthProviderType   @default(LOCAL)
  providerId    String?
  password      String?            // Hashed with argon2
  user          User               @relation(fields: [userId], references: [id])
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  @@unique([userId, provider])
}

model RefreshToken {
  id             String   @id @default(cuid())
  tokenHash      String   @unique
  userId         String
  familyId       String
  sessionId      String
  expiresAt      DateTime
  revoked        Boolean  @default(false)
  replacedById   String?  // Points to token that replaced this one
  replacedBy     RefreshToken? @relation("ReplacedBy", fields: [replacedById], references: [id])
  user           User     @relation(fields: [userId], references: [id])
  createdAt      DateTime @default(now())
}
```

### Enums

- **UserStatus**: `ACTIVE`, `SUSPENDED`, `PENDING`
- **Role**: `SUPER_ADMIN`, `ADMIN`, `MEMBER`, `GUEST`
- **AuthProviderType**: `LOCAL`, `GITHUB`, `GOOGLE`

### Migration Workflow

```bash
# Create a new migration
pnpm --filter @repo/database db:migrate -- --name your_migration_name

# Apply migrations in production
pnpm --filter @repo/database db:migrate:deploy
```

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
| **Access Token**  | JWT                   | 15 minutes | Authorization header |
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
@Permissions('user:write', 'billing:read')
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

**Role-Permission Matrix:**

| Role        | User:Read | User:Write | User:Delete | Tenant:Read | Tenant:Write | Billing:Read | Billing:Write |
| ----------- | --------- | ---------- | ----------- | ----------- | ------------ | ------------ | ------------- |
| SUPER_ADMIN | ✅        | ✅         | ✅          | ✅          | ✅           | ✅           | ✅            |
| ADMIN       | ✅        | ✅         | ✅          | ✅          | ✅           | ✅           | ✅            |
| MEMBER      | ✅        | ✅         | ❌          | ✅          | ❌           | ✅           | ❌            |
| GUEST       | ✅        | ❌         | ❌          | ✅          | ❌           | ❌           | ❌            |

### API Endpoints

| Method | Path                             | Auth              | Description              |
| ------ | -------------------------------- | ----------------- | ------------------------ |
| POST   | `/api/v1/auth/register`          | Public            | User registration        |
| POST   | `/api/v1/auth/login`             | Public            | Login with credentials   |
| POST   | `/api/v1/auth/refresh`           | Public            | Refresh access token     |
| POST   | `/api/v1/auth/logout`            | Required          | Logout and revoke token  |
| GET    | `/api/v1/auth/profile`           | Required          | Get current user profile |
| PATCH  | `/api/v1/auth/profile`           | Required          | Update user profile      |
| POST   | `/api/v1/auth/select-tenant/:id` | Required          | Switch active tenant     |
| POST   | `/api/v1/tenants`                | SUPER_ADMIN       | Create tenant            |
| GET    | `/api/v1/tenants`                | SUPER_ADMIN/ADMIN | List tenants             |
| GET    | `/api/v1/health`                 | Public            | Health check             |

---

## Testing

### Test Structure

```
apps/api/
├── test/
│   ├── e2e/               # End-to-end tests
│   │   ├── auth.e2e-spec.ts
│   │   ├── health.e2e-spec.ts
│   │   └── ...
│   ├── helpers/           # Test utilities
│   │   ├── test-db.ts
│   │   ├── test-app.ts
│   │   └── fixtures.ts
│   └── database.module.spec.ts
└── src/
    └── **/*.spec.ts       # Unit tests

apps/web/
├── src/
│   ├── __tests__/
│   │   ├── unit/          # Unit tests
│   │   └── components/    # Component tests
│   └── mocks/             # MSW handlers
```

### Test Commands

```bash
# Run all tests
pnpm test

# API tests
pnpm --filter @apps/api test         # Unit tests
pnpm --filter @apps/api test:e2e     # E2E tests
pnpm --filter @apps/api test:cov     # Coverage

# Web tests
pnpm --filter @apps/web test         # All tests
pnpm --filter @apps/web test:coverage # Coverage
pnpm --filter @apps/web test:watch   # Watch mode
```

### Test Coverage

| Package   | Tests   | Status             |
| --------- | ------- | ------------------ |
| API Unit  | 192     | ✅ Passing         |
| API E2E   | 70      | ✅ Passing         |
| Web Tests | 85      | ✅ Passing         |
| **Total** | **347** | ✅ **All Passing** |

### Test Stack

- **Vitest 4** — Fast test runner with ESM support
- **React Testing Library** — Component tests with user-centric API
- **MSW** — Network-level API mocking
- **Supertest** — HTTP assertion library
- **Testcontainers** — Ephemeral PostgreSQL for E2E tests

---

## CI/CD

### GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

**Pipeline Stages:**

1. **Setup** — Checkout, pnpm install, cache restoration
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
- Openssl included for Prisma
- Non-root user (`nestjs`)
- Production dependencies only
- Exposes port 3001

**Web Dockerfile** (`apps/web/Dockerfile`):

- Multi-stage build with standalone output
- Optimized Next.js deployment
- Non-root user (`nextjs`)
- Exposes port 3000

### Build Commands

```bash
# Build all Docker images
docker build -t api -f apps/api/Dockerfile .
docker build -t web -f apps/web/Dockerfile .

# Run containers
docker run -p 3001:3001 api
docker run -p 3000:3000 web
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db-host:5432/db
JWT_SECRET=strong-secret-key
JWT_EXPIRES_IN_ACCESS=15m
JWT_EXPIRES_IN_REFRESH=7d
CORS_ORIGINS=https://your-domain.com
```

---

## Environment Variables

### Root `.env`

| Variable                 | Required | Default            | Description                     |
| ------------------------ | -------- | ------------------ | ------------------------------- |
| `DATABASE_URL`           | ✅       | —                  | PostgreSQL connection string    |
| `POSTGRES_USER`          | ✅       | `dev`              | Database user                   |
| `POSTGRES_PASSWORD`      | ✅       | `dev`              | Database password               |
| `POSTGRES_DB`            | ✅       | `app_dev`          | Database name                   |
| `JWT_SECRET`             | ✅       | —                  | JWT signing key (HS256)         |
| `JWT_PRIVATE_KEY`        | ❌       | —                  | RSA private key (base64)        |
| `JWT_PUBLIC_KEY`         | ❌       | —                  | RSA public key (base64)         |
| `JWT_EXPIRES_IN_ACCESS`  | ❌       | `15m`              | Access token lifetime           |
| `JWT_EXPIRES_IN_REFRESH` | ❌       | `7d`               | Refresh token lifetime          |
| `JWT_ISSUER`             | ❌       | `turborepo-api`    | JWT issuer claim                |
| `JWT_AUDIENCE`           | ❌       | `turborepo-client` | JWT audience claim              |
| `CORS_ORIGINS`           | ✅       | —                  | Comma-separated allowed origins |
| `COOKIE_SECURE`          | ❌       | `false`            | Secure cookie flag              |
| `THROTTLE_TTL`           | ❌       | `60000`            | Rate limit time window (ms)     |
| `THROTTLE_LIMIT`         | ❌       | `10`               | Requests per window             |
| `NODE_ENV`               | ❌       | `development`      | Environment                     |
| `PORT`                   | ❌       | `3001`             | API port                        |

### Web `.env.local` (Client-side)

| Variable              | Required | Default                 | Description  |
| --------------------- | -------- | ----------------------- | ------------ |
| `NEXT_PUBLIC_API_URL` | ✅       | `http://localhost:3001` | API base URL |

---

## Contributing

### Development Guidelines

1. **Branch naming**: `feature/`, `fix/`, `chore/`
2. **Commit messages**: Conventional commits
3. **Code style**: Prettier + ESLint
4. **Type safety**: Strict TypeScript, no `any`

### Prerequisites Before PR

```bash
pnpm format:write   # Format code
pnpm lint           # Fix lint issues
pnpm build          # Ensure build passes
pnpm test           # Run all tests
```

### Adding New Workspaces

1. Create directory in `apps/` or `packages/`
2. Add `package.json` with `name` and `version`
3. Update `pnpm-workspace.yaml` if needed
4. Add `tsconfig.json` extending shared config
5. Register in `turbo.json` tasks

### Adding Dependencies

```bash
# Add to a specific workspace
pnpm --filter @apps/web add package-name

# Add to all workspaces
pnpm add -w package-name

# Add dev dependency
pnpm add -D package-name
```

---

## Troubleshooting

### Common Issues

**1. `EADDRINUSE` on port 3000/3001**

```bash
# Kill stale processes
fuser -k 3000/tcp 3001/tcp

# Or manually find and kill
lsof -i :3000
kill -9 <PID>
```

**2. `DATABASE_URL` not found**

```bash
# Load environment variables
source .env
# Or use dotenv-cli
pnpm --filter @apps/api exec dotenv -e ../../.env -- pnpm db:migrate
```

**3. Prisma client generation fails**

```bash
# Regenerate client
pnpm --filter @repo/database db:generate

# Verify DATABASE_URL is set
echo $DATABASE_URL
```

**4. TypeScript import errors**

Ensure all imports use `.js` extensions when `moduleResolution: "NodeNext"`:

```typescript
// ✅ Correct
import { loginSchema } from '@repo/shared/auth/login.schema.js';

// ❌ Incorrect
import { loginSchema } from '@repo/shared/auth/login.schema';
```

**5. Next.js build fails with extensionAlias**

Turbopack doesn't support `extensionAlias`. Use webpack mode:

```bash
# Use webpack instead of turbopack
pnpm --filter @apps/web dev:webpack
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

---

///////////////////////////////////////

# 06-TUrborepo

Polyglot-ready monorepo foundation using **Turborepo 2.9** + **pnpm 11** workspaces.

## Stack

| Layer               | Tool       | Version         |
| ------------------- | ---------- | --------------- |
| Package manager     | pnpm       | 11.x            |
| Build orchestrator  | Turborepo  | 2.9.x           |
| Node.js runtime     | Node       | 22 LTS          |
| Frontend            | Next.js    | 16.x            |
| Backend             | NestJS     | 11.x            |
| Database            | Prisma     | 7.x             |
| Linter (full)       | ESLint     | 9.x flat config |
| Linter (pre-flight) | Oxlint     | 1.x             |
| Formatter           | Prettier   | 3.x             |
| TypeScript          | TypeScript | 5.9             |

## Workspaces

```
apps/
  web/      # Next.js 16 application (@apps/web)
  api/      # NestJS 11 application (@apps/api)
packages/
  shared/             # Runtime contracts (@repo/shared)
  database/           # Prisma 7 client (@repo/database)
  config-eslint/      # Shared ESLint flat configs
  config-typescript/  # Shared tsconfig presets
```

## Prerequisites

- Node.js **>= 22** (see `.nvmrc`)
- pnpm **11** (auto-pinned via Corepack)

## Setup

```bash
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install
```

## Scripts

| Script         | Description                             |
| -------------- | --------------------------------------- |
| `pnpm dev`     | Run all dev servers in parallel         |
| `pnpm build`   | Build all workspaces                    |
| `pnpm lint`    | Lint all workspaces (ESLint)            |
| `pnpm lint:ox` | Pre-flight lint (Oxlint, sub-second)    |
| `pnpm test`    | Run all tests                           |
| `pnpm format`  | Format with Prettier                    |
| `pnpm clean`   | Remove all build outputs & node_modules |

## Turbo Pipeline

Defined in `turbo.json`:

- **build** → depends on `^build` and `^db:generate`
- **lint** → depends on `^build`, no outputs (read-only)
- **test** → depends on `^build`, outputs `coverage/`
- **dev** → persistent, no cache
- **db:generate** → Prisma client generation

## Remote Cache (CI)

Set the following repository secrets to enable Turborepo remote caching:

- `TURBO_TOKEN` — Vercel API token (or self-hosted)
- `TURBO_TEAM` — Vercel team slug (as a variable)

The CI workflow (`.github/workflows/ci.yml`) automatically wires these into every run.

## Pre-commit

Husky 9 runs `lint-staged` on every commit:

1. `oxlint --fix` on staged TS/JS files
2. `prettier --write` on staged files

A `pre-push` hook runs the full `turbo build lint test` pipeline.

## Path Aliases

- `@repo/shared/*` → `packages/shared/src/*`
- `@repo/database/*` → `packages/database/src/*`
- `@/*` → `apps/web/src/*` (Next.js)
- `@app/*` → `apps/api/src/*` (NestJS)
