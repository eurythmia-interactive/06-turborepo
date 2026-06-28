# Understanding Monorepo Architecture: A Complete Guide

## Overview

Welcome! In this lesson, we'll explore the architecture of a modern full-stack monorepo. Think of a monorepo like a **single house with multiple rooms** — instead of building separate houses (repositories) for your frontend, backend, and shared code, everything lives together under one roof.

**What you'll learn:**

- What a monorepo is and why companies use it
- How Turborepo and pnpm work together
- The project structure and what each part does
- How the frontend, backend, and database connect
- Real-world architecture patterns you can use

**Why this matters:** Modern companies like Google, Facebook, and Microsoft use monorepos because they make code sharing easier, ensure consistency, and speed up development. By the end of this lesson, you'll understand how to navigate and work in a professional monorepo.

---

## Prerequisites

Before diving in, you should be comfortable with:

- Basic JavaScript/TypeScript syntax
- What npm/yarn/pnpm are (package managers)
- Basic command line usage
- What React and Node.js are (we'll explain how they're used here)

Don't worry if you're not an expert — we'll explain everything as we go!

---

## What is a Monorepo?

### The Traditional Approach (Multiple Repositories)

Imagine you're building a web application. In the traditional approach, you'd have:

```
📁 frontend-repo/     (React app)
📁 backend-repo/      (Node.js API)
📁 shared-utils-repo/ (Shared validation code)
```

**Problems with this approach:**

- 🐌 **Slow updates**: Change shared code? You need to update 3 repositories
- 🐛 **Version mismatches**: Frontend expects v2.0 of shared code, but backend uses v1.5
- 🔗 **Difficult testing**: How do you test frontend + backend together?
- 📦 **Dependency duplication**: Same libraries installed in multiple places

### The Monorepo Approach (Single Repository)

Now imagine everything in one place:

```
📁 my-monorepo/
├── 📁 apps/
│   ├── 📁 frontend/    (React app)
│   └── 📁 backend/     (Node.js API)
├── 📁 packages/
│   └── 📁 shared/      (Shared validation code)
└── 📄 package.json     (One file to rule them all)
```

**Benefits:**

- ✅ **Instant updates**: Change shared code, all apps see it immediately
- ✅ **Single source of truth**: One version of everything
- ✅ **Easy testing**: Test the entire stack together
- ✅ **Atomic commits**: Make changes across frontend and backend in one commit

**Analogy:** Think of a monorepo like a **kitchen with all your ingredients in one place**. Instead of running to different stores (repositories) for each ingredient, everything is organized in your pantry (monorepo), making cooking (development) much faster.

---

## The Tools: Turborepo + pnpm

This project uses two powerful tools that work together:

### pnpm: The Package Manager

**What is pnpm?**
pnpm is like npm or yarn, but **faster and more efficient**. It saves disk space by storing packages in a single location and creating links to them.

**Key feature: Workspaces**
pnpm workspaces let you manage multiple packages in one repository. Each package can have its own `package.json` and dependencies.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*' # Everything in apps/ folder
  - 'packages/*' # Everything in packages/ folder
```

**Analogy:** If npm is a **shopping cart** where you add items one by one, pnpm is a **bulk warehouse** that organizes everything efficiently.

### Turborepo: The Build System

**What is Turborepo?**
Turborepo is like a **smart project manager** that:

- 🚀 Runs tasks in parallel (build, test, lint)
- 💾 Caches results (don't rebuild what hasn't changed)
- 🔗 Understands dependencies between packages
- ⚡ Speeds up your CI/CD pipeline

**Example:**

```bash
pnpm build  # Turborepo builds packages in the right order
```

If `@apps/web` depends on `@repo/shared`, Turborepo:

1. First builds `@repo/shared`
2. Then builds `@apps/web`
3. Caches both results
4. Next time, only rebuilds what changed

**Analogy:** Turborepo is like a **chef who knows the order to cook dishes**. If dessert needs the sauce from the main course, the chef makes the sauce first, then the dessert — and remembers what's already prepared.

---

## Project Structure: The Big Picture

Let's explore the folder structure:

```
06-TUrborepo/
│
├── 📁 apps/                          # Deployable applications
│   ├── 📁 api/                       # Backend API (NestJS)
│   │   ├── 📁 src/                   # Source code
│   │   │   ├── 📁 admin/            # Admin features
│   │   │   ├── 📁 auth/             # Authentication
│   │   │   ├── 📁 user/             # User management
│   │   │   └── 📄 main.ts           # App entry point
│   │   └── 📄 package.json          # API dependencies
│   │
│   └── 📁 web/                       # Frontend app (Next.js)
│       ├── 📁 src/
│       │   ├── 📁 app/              # Next.js pages
│       │   ├── 📁 components/       # React components
│       │   ├── 📁 actions/          # Server actions
│       │   └── 📁 lib/              # Utilities
│       └── 📄 package.json          # Web dependencies
│
├── 📁 packages/                      # Shared code (not deployable)
│   ├── 📁 database/                 # Database schema + client
│   │   ├── 📁 prisma/
│   │   │   ├── 📄 schema.prisma     # Database models
│   │   │   └── 📄 seed.ts           # Test data
│   │   └── 📁 src/
│   │       └── 📁 generated/        # Auto-generated Prisma client
│   │
│   ├── 📁 shared/                   # Shared validation schemas
│   │   └── 📁 src/
│   │       ├── 📁 admin/            # Admin validation
│   │       ├── 📁 auth/             # Auth validation
│   │       └── 📄 index.ts          # Exports
│   │
│   ├── 📁 config-eslint/            # Shared ESLint config
│   └── 📁 config-typescript/        # Shared TypeScript config
│
├── 📄 turbo.json                     # Turborepo configuration
├── 📄 pnpm-workspace.yaml           # pnpm workspace config
├── 📄 package.json                   # Root scripts + dependencies
├── 📄 docker-compose.yml            # Database setup
└── 📄 .env                          # Environment variables
```

### Key Distinction: Apps vs Packages

**Apps (apps/):**

- 🚀 **Deployable** — These run as standalone services
- 🌐 **User-facing** — Users interact with these
- 📦 **Have their own servers** — Web server, API server
- Examples: `@apps/web` (frontend), `@apps/api` (backend)

**Packages (packages/):**

- 📚 **Not deployable** — Used by apps
- 🔧 **Shared utilities** — Code used by multiple apps
- 📦 **No standalone server** — Imported by apps
- Examples: `@repo/database`, `@repo/shared`

**Analogy:**

- **Apps** are like **restaurants** — they serve customers directly
- **Packages** are like **kitchen suppliers** — they provide ingredients and tools to restaurants

---

## Deep Dive: The Backend API (@apps/api)

### What is NestJS?

The backend uses **NestJS**, a framework for building efficient, scalable Node.js applications. Think of it as a **structured way to organize your backend code**.

**Key features:**

- 🏗️ **Modular architecture** — Code organized into modules
- 🔒 **Built-in security** — Authentication, authorization
- 📝 **TypeScript-first** — Full type safety
- 🧪 **Testing-friendly** — Easy to write tests

### API Structure

```
apps/api/src/
├── 📁 admin/              # Admin dashboard features
│   ├── 📁 analytics/      # Dashboard metrics
│   ├── 📁 audit/          # Audit logs
│   ├── 📁 role/           # Role management
│   ├── 📁 tenant/         # Tenant management
│   ├── 📁 user/           # User management
│   ├── 📁 impersonation/  # User impersonation
│   ├── 📁 invitation/     # Invitation management
│   ├── 📁 session/        # Session management
│   └── 📁 system/         # Maintenance mode
│
├── 📁 auth/               # Authentication
│   ├── 📄 auth.controller.ts  # Login, register, logout
│   ├── 📄 auth.service.ts     # Business logic
│   ├── 📄 auth.module.ts      # Module definition
│   ├── 📁 guards/             # Route protection
│   ├── 📁 decorators/         # Custom decorators
│   └── 📁 config/             # JWT configuration
│
├── 📁 user/               # User endpoints
├── 📁 tenant/             # Tenant endpoints
├── 📁 invitation/         # Public invitation endpoints
├── 📁 common/             # Shared utilities
│   ├── 📁 email/          # Email service (Resend)
│   ├── 📁 filters/        # Exception filters
│   ├── 📁 pipes/          # Validation pipes
│   └── 📁 middleware/     # Request logging
│
├── 📁 config/             # Environment validation
├── 📁 database/           # Database connection
├── 📁 health/             # Health check endpoint
└── 📄 main.ts             # App bootstrap
```

### How Authentication Works

The API uses **JWT (JSON Web Tokens)** for authentication:

```
1. User logs in → API validates credentials
2. API creates two tokens:
   - Access token (15 min) — Used for API requests
   - Refresh token (7 days) — Stored in httpOnly cookie
3. Frontend stores tokens in cookies
4. On each request: Frontend sends access token in header
5. When access token expires: Frontend uses refresh token to get new access token
```

**Security features:**

- 🔐 Passwords hashed with **Argon2** (very secure)
- 🍪 Refresh tokens in **httpOnly cookies** (can't be stolen by XSS)
- 🔄 **Token rotation** — Each refresh creates new tokens
- 🚫 **Rate limiting** — Prevents brute force attacks (5 req/min login, 3 req/min register)
- 🛡️ **Helmet** — Security headers on all responses

### Example: User Login Flow

```typescript
// apps/api/src/auth/auth.controller.ts
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // 1. Validate input with Zod schema
  // 2. Check if user exists
  // 3. Verify password with Argon2
  // 4. Generate access + refresh tokens
  // 5. Store refresh token in database (hashed with SHA-256)
  // 6. Set refresh token in httpOnly cookie
  // 7. Return access token to frontend
}
```

### Application Module Structure

The main `AppModule` imports all feature modules and sets up global guards:

```typescript
// apps/api/src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Environment variables
    ThrottlerModule.forRoot(), // Rate limiting
    DatabaseModule, // Prisma client
    AuthModule, // Authentication
    UserModule, // User management
    TenantModule, // Tenant management
    AdminModule, // Admin features
    EmailModule, // Email service
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // Authentication
    { provide: APP_GUARD, useClass: TenantGuard }, // Multi-tenancy
    { provide: APP_GUARD, useClass: RolesGuard }, // Role-based access
    { provide: APP_GUARD, useClass: PermissionsGuard }, // Permission checks
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // Rate limiting
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware).forRoutes('*');
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
```

---

## Deep Dive: The Frontend (@apps/web)

### What is Next.js?

The frontend uses **Next.js 16**, a React framework that provides:

- 🚀 **Server-side rendering** — Faster page loads
- 📄 **File-based routing** — Pages = files
- ⚡ **Server actions** — Call backend from components
- 🎨 **Built-in optimizations** — Images, fonts, scripts

### Frontend Structure

```
apps/web/src/
├── 📁 app/                    # Pages (file-based routing)
│   ├── 📁 (auth)/             # Auth routes (login, register)
│   ├── 📁 admin/              # Admin dashboard
│   │   ├── 📁 audit/          # Audit logs
│   │   ├── 📁 invitations/    # Invitation management
│   │   ├── 📁 login/          # Admin login
│   │   ├── 📁 roles/          # Role management
│   │   ├── 📁 sessions/       # Session management
│   │   ├── 📁 settings/       # System settings
│   │   ├── 📁 tenants/        # Tenant management
│   │   ├── 📁 users/          # User management
│   │   └── 📄 page.tsx        # Dashboard home
│   │
│   ├── 📁 dashboard/          # User dashboard
│   ├── 📁 invite/             # Invitation acceptance
│   ├── 📁 maintenance/        # Maintenance page
│   ├── 📄 layout.tsx          # Root layout
│   └── 📄 page.tsx            # Home page
│
├── 📁 components/             # React components
│   ├── 📁 admin/              # Admin components (32 files)
│   │   ├── 📁 charts/         # Data visualization (Recharts)
│   │   ├── 📄 user-list.tsx   # User table
│   │   ├── 📄 tenant-list.tsx # Tenant table
│   │   └── 📄 dashboard-client.tsx
│   │
│   ├── 📁 forms/              # Form components
│   ├── 📁 layout/             # Layout components
│   ├── 📁 providers/          # Context providers
│   └── 📁 ui/                 # shadcn/ui components
│
├── 📁 actions/                # Server actions (13 files)
│   ├── 📄 auth.ts             # Login, register, logout
│   ├── 📄 users.ts            # User CRUD
│   ├── 📄 tenants.ts          # Tenant CRUD
│   ├── 📄 roles.ts            # Role management
│   ├── 📄 audit.ts            # Audit logs
│   ├── 📄 sessions.ts         # Session management
│   ├── 📄 invitations.ts      # Invitation management
│   ├── 📄 maintenance.ts      # Maintenance mode
│   ├── 📄 impersonation.ts    # User impersonation
│   └── 📄 dashboard.ts        # Dashboard metrics
│
├── 📁 lib/                    # Utilities
│   ├── 📄 api-client.ts       # API calls (fetch wrapper)
│   ├── 📄 authenticated-api-client.ts  # With auth headers
│   ├── 📄 server-api-client.ts  # Server-side API calls
│   ├── 📄 session.ts          # Session management
│   ├── 📄 token-store.ts      # Token storage (cookies)
│   └── 📄 utils.ts            # Helper functions
│
├── 📁 mocks/                  # MSW handlers for testing
└── 📄 proxy.ts                # Route protection middleware
```

### Server Actions: The Modern Way

Next.js uses **Server Actions** to call backend logic directly from components:

```typescript
// apps/web/src/actions/users.ts
'use server'

import { createUserSchema } from '@repo/shared'
import { authenticatedApiClient } from '@/lib/authenticated-api-client'

export async function createUser(data: CreateUserInput) {
  // 1. Validate data with Zod schema from @repo/shared
  const validated = createUserSchema.parse(data)

  // 2. Call API with authentication
  const response = await authenticatedApiClient.post('/admin/users', {
    body: JSON.stringify(validated),
  })

  // 3. Return result to component
  return response
}

// In a component:
import { createUser } from '@/actions/users'

function CreateUserForm() {
  async function handleSubmit(formData: FormData) {
    const result = await createUser({
      name: formData.get('name'),
      email: formData.get('email'),
    })

    if (result.success) {
      toast.success('User created')
      router.refresh()  // Re-render server components
    }
  }

  return <form action={handleSubmit}>...</form>
}
```

**Benefits:**

- ✅ No need for API routes for simple operations
- ✅ Type-safe end-to-end
- ✅ Automatic form validation
- ✅ Works without JavaScript (progressive enhancement)

### Route Protection (proxy.ts)

The `proxy.ts` middleware protects routes based on authentication:

```typescript
// apps/web/proxy.ts
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes require SUPER_ADMIN or ADMIN role
  if (isAdminPath(pathname)) {
    const accessToken = request.cookies.get('access_token');
    const userRole = request.cookies.get('user_role');

    if (!accessToken?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (userRole?.value !== 'SUPER_ADMIN' && userRole?.value !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protected routes require authentication
  if (isProtectedPath(pathname)) {
    const accessToken = request.cookies.get('access_token');

    if (!accessToken?.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}
```

### Admin Dashboard Features

The admin dashboard (`/admin`) provides:

| Feature         | Description                    | Route                |
| --------------- | ------------------------------ | -------------------- |
| **Dashboard**   | Metrics, charts, activity feed | `/admin`             |
| **Users**       | CRUD, suspend, bulk operations | `/admin/users`       |
| **Tenants**     | Organizations, plans, stats    | `/admin/tenants`     |
| **Roles**       | Custom roles, permissions      | `/admin/roles`       |
| **Audit Logs**  | Activity tracking, export      | `/admin/audit`       |
| **Sessions**    | Active sessions, revoke        | `/admin/sessions`    |
| **Invitations** | Email invitations, tracking    | `/admin/invitations` |
| **Settings**    | Maintenance mode, IP allowlist | `/admin/settings`    |

---

## Deep Dive: Shared Packages

### @repo/database: The Database Layer

**What it does:**

- 📊 Defines database schema (tables, relationships)
- 🔌 Provides Prisma client (type-safe database queries)
- 🌱 Seeds test data

**Technology: Prisma ORM**
Prisma is a **next-generation ORM** that lets you write database queries in TypeScript instead of SQL.

```prisma
// packages/database/prisma/schema.prisma
model User {
  id             String      @id @default(cuid())
  email          String      @unique
  name           String?
  status         UserStatus  @default(PENDING)
  role           Role        @default(MEMBER)
  customRoleId   String?
  isSystem       Boolean     @default(false)
  lastLoginAt    DateTime?
  deletedAt      DateTime?    // Soft delete
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  providers           AuthenticationProvider[]
  sessions            RefreshToken[]
  tenants             UserTenant[]      // Multi-tenancy
  auditLogs           AuditLog[]
  customRole          CustomRole?
}

model Tenant {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique  // URL-friendly name
  plan      String    @default("free")
  domain    String?
  suspended Boolean   @default(false)
  deletedAt DateTime?

  users        UserTenant[]
  auditLogs    AuditLog[]
  featureFlags FeatureFlag[]
  apiKeys      ApiKey[]
  invitations  UserInvitation[]
}

model UserTenant {
  userId       String
  tenantId     String
  role         Role      @default(MEMBER)
  customRoleId String?

  user         User       @relation(fields: [userId], references: [id])
  tenant       Tenant     @relation(fields: [tenantId], references: [id])
  customRole   CustomRole?

  @@id([userId, tenantId])  // Composite primary key
}

model CustomRole {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  permissions String[]  // Array of permission strings
  isSystem    Boolean  @default(false)

  users       User[]
  userTenants UserTenant[]
}
```

**How it's used:**

```typescript
// packages/database/src/index.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/index.js';

const connectionString = process.env.DATABASE_URL;

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = createClient();
export { PrismaClient, Prisma } from './generated/prisma/index.js';
export { Role, UserStatus, AuthProviderType } from './generated/prisma/index.js';

// In the API
import { prisma } from '@repo/database';

// Create a user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    role: 'MEMBER',
  },
});

// Get user with tenants
const userWithTenants = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: {
    tenants: {
      include: { tenant: true },
    },
  },
});
```

**Benefits:**

- ✅ **Type-safe** — TypeScript knows your schema
- ✅ **Auto-completion** — IDE suggests fields
- ✅ **Migrations** — Version control for database
- ✅ **No SQL** — Write queries in TypeScript

### @repo/shared: Validation Schemas

**What it does:**

- ✅ Defines validation schemas with Zod
- 🔄 Shared between frontend and backend
- 🛡️ Ensures data consistency

**Technology: Zod**
Zod is a **TypeScript-first validation library** that lets you define schemas and validate data.

```typescript
// packages/shared/src/auth/login.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
  }),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
```

**How it's used:**

```typescript
// In the API (backend validation)
import { loginSchema } from '@repo/shared'

@Post('login')
async login(@Body() body: unknown) {
  // Validate input
  const result = loginSchema.safeParse(body)

  if (!result.success) {
    throw new BadRequestException(result.error.errors)
  }

  // result.data is now typed as LoginInput
  const { email, password } = result.data

  // Continue with login...
}

// In the frontend (form validation)
import { loginSchema } from '@repo/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

function LoginForm() {
  const form = useForm({
    resolver: zodResolver(loginSchema),  // Use same schema!
  })

  // Form automatically validates with same rules
}
```

**Benefits:**

- ✅ **Single source of truth** — Validation rules defined once
- ✅ **Type-safe** — TypeScript infers types from schemas
- ✅ **Consistent** — Frontend and backend validate the same way
- ✅ **DRY** — Don't Repeat Yourself

### Permission System

The shared package defines 21 permissions across 5 categories:

```typescript
// packages/shared/src/admin/permissions.ts
export const Permissions = {
  // Tenant permissions
  TENANT_READ: 'tenant:read',
  TENANT_WRITE: 'tenant:write',
  TENANT_DELETE: 'tenant:delete',
  TENANT_SUSPEND: 'tenant:suspend',

  // User permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_SUSPEND: 'user:suspend',
  USER_RESET_PASSWORD: 'user:reset-password',
  USER_IMPERSONATE: 'user:impersonate',

  // Role permissions
  ROLE_READ: 'role:read',
  ROLE_WRITE: 'role:write',
  ROLE_DELETE: 'role:delete',

  // Admin permissions
  ADMIN_ACCESS: 'admin:access',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_FEATURE_FLAGS: 'admin:feature-flags',
  ADMIN_AUDIT: 'admin:audit',
  ADMIN_API_KEYS: 'admin:api-keys',

  // System permissions
  SYSTEM_MAINTENANCE: 'system:maintenance',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_CONFIG: 'system:config',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// Role-to-permission mapping
export const RolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: AllPermissions, // All 21 permissions
  ADMIN: [
    // 15 permissions (no system or impersonation)
    Permissions.TENANT_READ,
    Permissions.TENANT_WRITE,
    // ... etc
  ],
  MEMBER: [Permissions.USER_READ, Permissions.TENANT_READ],
  GUEST: [Permissions.USER_READ],
};
```

### @repo/config-eslint & @repo/config-typescript

**What they do:**

- 📏 Share ESLint configuration across all packages
- 📘 Share TypeScript configuration across all packages

**Why this matters:**
Without shared configs, you'd need to copy-paste configuration files into every package. With shared configs:

```json
// apps/api/tsconfig.json
{
  "extends": "@repo/config-typescript/base.json",
  "compilerOptions": {
    // API-specific overrides
  }
}

// apps/web/tsconfig.json
{
  "extends": "@repo/config-typescript/base.json",
  "compilerOptions": {
    // Web-specific overrides
  }
}
```

**Benefits:**

- ✅ **Consistency** — Same rules everywhere
- ✅ **Easy updates** — Change once, applies everywhere
- ✅ **Less duplication** — DRY principle

---

## How Everything Connects: Data Flow

Let's trace a complete request from user to database and back:

### Example: User Logs In

```
1. USER ACTION
   User fills login form and clicks "Login"
   ↓
2. FRONTEND (Next.js)
   - Form validates with loginSchema from @repo/shared
   - Server action calls API
   ↓
3. API REQUEST
   POST /api/v1/auth/login
   Body: { email: "user@example.com", password: "password123" }
   ↓
4. BACKEND (NestJS)
   - AuthController receives request
   - Validates with loginSchema (same schema!)
   - AuthService checks database
   ↓
5. DATABASE (PostgreSQL via Prisma)
   - prisma.user.findUnique({ where: { email } })
   - Returns user with password hash
   ↓
6. PASSWORD VERIFICATION
   - argon2.verify(password, hash)
   - Returns true/false
   ↓
7. TOKEN GENERATION
   - Create access token (JWT, 15 min)
   - Create refresh token (random, 7 days)
   - Hash refresh token (SHA-256) and store in database
   ↓
8. RESPONSE
   - Set refresh token in httpOnly cookie
   - Return access token in response body
   ↓
9. FRONTEND RECEIVES RESPONSE
   - Store tokens in cookies
   - Redirect to dashboard
   ↓
10. SUBSEQUENT REQUESTS
    - Frontend includes access token in Authorization header
    - API validates token on each request
    - When expired, use refresh token to get new access token
```

### Visual Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                      (Next.js - @apps/web)                   │
│                                                              │
│  ┌──────────────┐                                           │
│  │   React      │                                           │
│  │  Components  │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│  ┌──────▼───────┐         ┌──────────────────┐             │
│  │Server Actions│◄────────┤ @repo/shared     │             │
│  └──────┬───────┘         │ (Zod schemas)    │             │
│         │                  └──────────────────┘             │
└─────────┼──────────────────────────────────────────────────┘
          │ HTTP Request
          │ (with JWT token)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│                     (NestJS - @apps/api)                     │
│                                                              │
│  ┌──────────────┐         ┌──────────────────┐             │
│  │ Controllers  │◄────────┤ @repo/shared     │             │
│  └──────┬───────┘         │ (Zod schemas)    │             │
│         │                  └──────────────────┘             │
│  ┌──────▼───────┐                                           │
│  │  Services    │                                           │
│  │(Business Log)│                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
└─────────┼──────────────────────────────────────────────────┘
          │ Prisma Client
          ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│                 (@repo/database + PostgreSQL)                │
│                                                              │
│  ┌──────────────┐                                           │
│  │Prisma Schema │  ──►  PostgreSQL Database                 │
│  │(schema.prisma│       (Users, Tenants, Roles, etc.)      │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Architecture Patterns

### 1. Multi-Tenancy

**What is multi-tenancy?**
Multi-tenancy allows **multiple organizations (tenants)** to use the same application while keeping their data separate.

**How it works here:**

```
Tenant A (Acme Corp)
├── Users: alice@acme.com, bob@acme.com
└── Data: Acme's projects, settings, etc.

Tenant B (Globex Inc)
├── Users: carol@globex.com, dave@globex.com
└── Data: Globex's projects, settings, etc.
```

**Database structure:**

```typescript
// UserTenant join table connects users to tenants
model UserTenant {
  userId   String
  tenantId String
  role     Role

  user     User   @relation(...)
  tenant   Tenant @relation(...)

  @@id([userId, tenantId])  // User can belong to multiple tenants
}
```

**Benefits:**

- ✅ One codebase serves multiple organizations
- ✅ Data isolation between tenants
- ✅ Easy to scale (add more tenants, not more apps)

### 2. Role-Based Access Control (RBAC)

**What is RBAC?**
RBAC restricts system access based on **roles** assigned to users.

**Roles in this project:**

| Role            | Permissions               | Use Case              |
| --------------- | ------------------------- | --------------------- |
| **SUPER_ADMIN** | All 21 permissions        | System administrators |
| **ADMIN**       | 15 permissions            | Tenant administrators |
| **MEMBER**      | 2 permissions (read-only) | Regular users         |
| **GUEST**       | 1 permission (user:read)  | Limited access        |

**How it's enforced:**

```typescript
// In the API
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)  // Only admins can access
@Get('admin-only')
async adminEndpoint() {
  return 'Admin data'
}

// With specific permissions
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('user:write')  // Must have user:write permission
@Patch('users/:id')
async updateUser() {
  // Update user
}
```

**Benefits:**

- ✅ Fine-grained access control
- ✅ Easy to manage (assign roles, not individual permissions)
- ✅ Scalable (add new roles as needed)

### 3. Soft Deletes

**What are soft deletes?**
Instead of deleting data permanently, mark it as deleted with a timestamp.

```typescript
model User {
  // ... other fields
  deletedAt DateTime?  // Null = active, Date = deleted
  deletedBy String?    // Who deleted it
}
```

**How it works:**

```typescript
// "Delete" a user (soft delete)
await prisma.user.update({
  where: { id: userId },
  data: {
    deletedAt: new Date(),
    deletedBy: adminId,
  },
});

// Query only active users
const activeUsers = await prisma.user.findMany({
  where: { deletedAt: null },
});

// Restore a deleted user
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: null, deletedBy: null },
});
```

**Benefits:**

- ✅ Data can be recovered
- ✅ Audit trail (who deleted what, when)
- ✅ Referential integrity (foreign keys still work)

### 4. Audit Logging

**What is audit logging?**
Track all important actions for security and compliance.

```typescript
model AuditLog {
  id        String   @id @default(cuid())
  userId    String   // Who did it
  tenantId  String?  // Which tenant
  action    String   // What they did
  details   Json?    // Additional data
  ip        String   // IP address
  userAgent String   // Browser/device
  createdAt DateTime @default(now())
}
```

**Example audit logs:**

```json
{
  "action": "user.login",
  "userId": "abc123",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2024-01-15T10:30:00Z"
}

{
  "action": "user.update",
  "userId": "abc123",
  "details": {
    "changedFields": ["name", "email"],
    "oldValues": { "name": "John", "email": "old@example.com" },
    "newValues": { "name": "Jane", "email": "new@example.com" }
  }
}
```

**Benefits:**

- ✅ Security (track suspicious activity)
- ✅ Compliance (meet regulatory requirements)
- ✅ Debugging (understand what happened)

---

## Development Workflow

### Common Commands

```bash
# Start development (starts database + all apps)
pnpm dev

# Start only specific app
pnpm --filter @apps/web dev     # Frontend only
pnpm --filter @apps/api dev     # Backend only

# Build everything
pnpm build

# Run tests
pnpm test

# Database operations
pnpm db:up                      # Start PostgreSQL
pnpm db:studio                  # Open Prisma Studio (database GUI)
pnpm --filter @repo/database db:migrate   # Create migration
pnpm --filter @repo/database db:seed      # Seed test data

# Code quality
pnpm lint                       # Run ESLint
pnpm format                     # Format with Prettier
```

### Adding a New Feature

Let's say you want to add a "Comments" feature:

**1. Update database schema**

```prisma
// packages/database/prisma/schema.prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  userId    String
  postId    String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
  post      Post     @relation(fields: [postId], references: [id])
}

// Add to User and Post models
model User {
  // ... existing fields
  comments  Comment[]
}

model Post {
  // ... existing fields
  comments  Comment[]
}
```

**2. Generate Prisma client**

```bash
pnpm --filter @repo/database db:generate
```

**3. Create migration**

```bash
pnpm --filter @repo/database db:migrate
```

**4. Add validation schema**

```typescript
// packages/shared/src/comments/comment.schema.ts
import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  postId: z.string(),
});

export type CreateCommentSchema = z.infer<typeof createCommentSchema>;
```

**5. Export from shared package**

```typescript
// packages/shared/src/index.ts
export * from './comments/comment.schema.js';
```

**6. Create API endpoint**

```typescript
// apps/api/src/comments/comments.controller.ts
@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: CreateCommentSchema, @CurrentUser() user: User) {
    return this.commentsService.create(body, user.id);
  }
}
```

**7. Create frontend form**

```typescript
// apps/web/src/app/posts/[id]/comment-form.tsx
'use client'

import { createComment } from '@/actions/comments'

export function CommentForm({ postId }: { postId: string }) {
  async function handleSubmit(formData: FormData) {
    await createComment({
      postId,
      content: formData.get('content') as string,
    })
  }

  return (
    <form action={handleSubmit}>
      <textarea name="content" />
      <button type="submit">Post Comment</button>
    </form>
  )
}
```

**8. Create server action**

```typescript
// apps/web/src/actions/comments.ts
'use server';

import { createCommentSchema } from '@repo/shared';
import { prisma } from '@repo/database';

export async function createComment(data: CreateCommentSchema) {
  const validated = createCommentSchema.parse(data);

  return prisma.comment.create({
    data: validated,
  });
}
```

---

## Testing Strategy

### Test Types

**1. Unit Tests**
Test individual functions/components in isolation.

```typescript
// apps/api/src/auth/auth.service.spec.ts
describe('AuthService', () => {
  it('should hash password with argon2', async () => {
    const service = new AuthService();
    const hash = await service.hashPassword('password123');
    expect(hash).toMatch(/^\$argon2id\$/);
  });
});
```

**2. Integration Tests**
Test how components work together.

```typescript
// apps/api/test/e2e/auth.e2e-spec.ts
describe('Auth (e2e)', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200);

    expect(response.body.access_token).toBeDefined();
  });
});
```

**3. Component Tests**
Test React components.

```typescript
// apps/web/src/components/login-form.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './login-form'

it('should show error for invalid email', async () => {
  render(<LoginForm />)

  await userEvent.type(screen.getByLabelText('Email'), 'invalid-email')
  await userEvent.click(screen.getByRole('button', { name: 'Login' }))

  expect(screen.getByText('Invalid email address')).toBeInTheDocument()
})
```

### Test Coverage

| Package   | Tests   | Status             |
| --------- | ------- | ------------------ |
| Backend   | 321     | ✅ Passing         |
| Frontend  | 141     | ✅ Passing         |
| **Total** | **462** | ✅ **All Passing** |

---

## Deployment

### Docker Setup

The project includes Dockerfiles for production deployment:

**API Dockerfile:**

```dockerfile
# Multi-stage build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER nestjs  # Non-root user for security
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

**Web Dockerfile:**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Build and Run

```bash
# Build Docker images
docker build -t api -f apps/api/Dockerfile .
docker build -t web -f apps/web/Dockerfile .

# Run containers
docker run -p 3001:3001 api
docker run -p 3000:3000 web
```

---

## Key Takeaways

✅ **Monorepo benefits:**

- Single source of truth
- Easy code sharing
- Consistent tooling
- Atomic commits

✅ **Turborepo + pnpm:**

- pnpm manages packages efficiently
- Turborepo orchestrates builds
- Caching speeds up development
- Parallel execution saves time

✅ **Project structure:**

- `apps/` contains deployable applications
- `packages/` contains shared code
- Clear separation of concerns
- Modular architecture

✅ **Technology stack:**

- **Backend:** NestJS (structured, scalable)
- **Frontend:** Next.js (fast, modern)
- **Database:** PostgreSQL + Prisma (type-safe)
- **Validation:** Zod (shared schemas)
- **Authentication:** JWT + httpOnly cookies

✅ **Architecture patterns:**

- Multi-tenancy (serve multiple organizations)
- RBAC (role-based access control)
- Soft deletes (recoverable data)
- Audit logging (track all actions)

✅ **Development workflow:**

- Shared configurations (ESLint, TypeScript)
- Automated testing (unit, integration, e2e)
- Docker deployment (consistent environments)
- CI/CD pipeline (automated checks)

---

## Next Steps

Now that you understand the architecture, you can:

1. **Explore the code:**
   - Look at `apps/api/src/auth/` to see authentication in action
   - Check `apps/web/src/app/admin/` for the admin dashboard
   - Review `packages/shared/src/` for shared validation schemas

2. **Try common tasks:**
   - Add a new field to a database model
   - Create a new API endpoint
   - Build a new React component
   - Write a test

3. **Learn more:**
   - [Turborepo documentation](https://turbo.build/repo/docs)
   - [pnpm workspaces](https://pnpm.io/workspaces)
   - [NestJS documentation](https://docs.nestjs.com/)
   - [Next.js documentation](https://nextjs.org/docs)
   - [Prisma documentation](https://www.prisma.io/docs)

---

## Questions?

If anything is unclear, ask me to explain:

- How authentication works in detail
- How to add a new feature end-to-end
- How multi-tenancy is implemented
- How the testing strategy works
- Any other part of the architecture

**Remember:** The best way to learn is by doing! Try making small changes and see how they affect the system.

Happy coding! 🚀
