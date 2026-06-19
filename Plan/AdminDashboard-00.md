# Phase 0: Prerequisites & Foundation — Complete Instructions

## Overview
This phase establishes the database foundation and core infrastructure for the Super Admin Dashboard. You'll add new database models, set up the permission system, create admin-specific guards, and define shared validation schemas.

---

## Task 0.1: Database Schema Updates

### 0.1.1 Add `AuditLog` Model

**Objective:** Create an audit trail model to track all admin actions for security and compliance.

**File Location:** `packages/database/prisma/schema.prisma`

**Requirements:**
- Add `AuditLog` model with the following fields:
  - `id`: String, `@id @default(cuid())`
  - `userId`: String (references User)
  - `tenantId`: String? (optional, references Tenant)
  - `action`: String (e.g., "user.created", "tenant.suspended")
  - `details`: Json (additional context as JSON)
  - `ip`: String? 
  - `userAgent`: String?
  - `createdAt`: DateTime, `@default(now())`
- Add relations to `User` and `Tenant`
- Add indexes on `userId`, `tenantId`, `action`, and `createdAt` for query performance

**Verification:**
- Model compiles without errors
- Relations are correctly defined
- Indexes are added

---

### 0.1.2 Add `SystemConfig` Model

**Objective:** Store system-wide configuration settings that can be modified at runtime.

**File Location:** `packages/database/prisma/schema.prisma`

**Requirements:**
- Add `SystemConfig` model with:
  - `id`: String, `@id @default(cuid())`
  - `key`: String, `@unique`
  - `value`: Json
  - `description`: String?
  - `updatedAt`: DateTime, `@updatedAt`
  - `updatedBy`: String? (references User)
- Add relation to `User` for tracking who made changes

**Verification:**
- Model compiles without errors
- Key field has unique constraint
- JSON field is properly typed

---

### 0.1.3 Add `FeatureFlag` Model

**Objective:** Enable/disable features globally or per-tenant for gradual rollouts.

**File Location:** `packages/database/prisma/schema.prisma`

**Requirements:**
- Add `FeatureFlag` model with:
  - `id`: String, `@id @default(cuid())`
  - `key`: String, `@unique`
  - `name`: String
  - `description`: String?
  - `enabled`: Boolean, `@default(false)`
  - `tenantId`: String? (optional, references Tenant — null = global flag)
  - `updatedAt`: DateTime, `@updatedAt`
  - `updatedBy`: String? (references User)
- Add relation to `Tenant` and `User`
- Add index on `tenantId` for queries

**Verification:**
- Model compiles without errors
- Tenant relation is optional
- Default value for enabled is false

---

### 0.1.4 Add `ApiKey` Model

**Objective:** Manage API keys for programmatic access to the API.

**File Location:** `packages/database/prisma/schema.prisma`

**Requirements:**
- Add `ApiKey` model with:
  - `id`: String, `@id @default(cuid())`
  - `name`: String (human-readable identifier)
  - `keyHash`: String, `@unique` (SHA-256 hash of the actual key)
  - `tenantId`: String? (optional, references Tenant)
  - `userId`: String? (optional, references User)
  - `permissions`: String[] (array of permission strings)
  - `expiresAt`: DateTime?
  - `lastUsedAt`: DateTime?
  - `createdAt`: DateTime, `@default(now())`
  - `revoked`: Boolean, `@default(false)`
- Add relations to `Tenant` and `User`
- Add indexes on `keyHash` and `tenantId`

**Verification:**
- Model compiles without errors
- keyHash has unique constraint
- Permissions is a string array
- Relations are properly defined

---

### 0.1.5 Add `UserInvitation` Model

**Objective:** Track user invitations with role and tenant assignments.

**File Location:** `packages/database/prisma/schema.prisma`

**Requirements:**
- Add `UserInvitation` model with:
  - `id`: String, `@id @default(cuid())`
  - `email`: String
  - `token`: String, `@unique` (secure random token)
  - `tenantId`: String? (references Tenant)
  - `role`: Role (from existing Role enum)
  - `invitedBy`: String (references User)
  - `acceptedAt`: DateTime?
  - `expiresAt`: DateTime
  - `createdAt`: DateTime, `@default(now())`
- Add relations to `Tenant` and `User` (invitedBy)
- Add indexes on `token`, `email`, and `expiresAt`

**Verification:**
- Model compiles without errors
- Token field has unique constraint
- Role uses the existing enum
- Relations are properly defined

---

### 0.1.6 Create Migration and Generate Client

**Objective:** Generate database migration and update Prisma client.

**Requirements:**
1. Run `pnpm --filter @repo/database db:migrate -- --name add_admin_models`
2. Verify the migration file is created in `packages/database/prisma/migrations/`
3. Run `pnpm --filter @repo/database db:generate` to update the Prisma client
4. Verify TypeScript types are generated correctly
5. Run `pnpm build` to ensure no compilation errors

**Verification:**
- Migration applies successfully to database
- Prisma client includes all new models with proper types
- No TypeScript errors in database package
- TypeScript intellisense works for new models

---

## Task 0.2: Permission System Foundation

### 0.2.1 Define Comprehensive Permission Matrix

**Objective:** Create a complete permission system covering all admin actions, centralized in the shared package for use by both API and validation schemas.

**File Location:** `packages/shared/src/admin/permissions.ts`

**Requirements:**
- **Extract existing permissions**: Move the hardcoded `ROLE_PERMISSIONS` map from `apps/api/src/auth/guards/permissions.guard.ts` into this file
- **Drop `billing:*` permissions**: Remove `billing:read` and `billing:write` (no billing implementation exists)
- Define a `Permissions` object with all available permissions, grouped by resource:
  - **Tenant Permissions:**
    - `tenant:read` — View tenant list and details
    - `tenant:write` — Create and update tenants
    - `tenant:delete` — Delete tenants
    - `tenant:suspend` — Suspend/restore tenants
  - **User Permissions:**
    - `user:read` — View user list and details
    - `user:write` — Create and update users
    - `user:delete` — Delete users
    - `user:suspend` — Suspend/activate users
    - `user:reset-password` — Force password reset
    - `user:impersonate` — Impersonate users
  - **Role Permissions:**
    - `role:read` — View roles and permissions
    - `role:write` — Create and edit roles
    - `role:delete` — Delete roles
  - **Admin Permissions:**
    - `admin:access` — Access admin dashboard
    - `admin:settings` — Modify system settings
    - `admin:feature-flags` — Manage feature flags
    - `admin:audit` — View audit logs
    - `admin:api-keys` — Manage API keys
  - **System Permissions:**
    - `system:maintenance` — Toggle maintenance mode
    - `system:backup` — Manage backups
    - `system:config` — Modify system config

- Define `RolePermissions` mapping (extracted from existing guard, with `billing:*` removed):
  - `SUPER_ADMIN`: All permissions listed above
  - `ADMIN`: Most tenant/user/role permissions (exclude `user:impersonate`, `admin:settings`, `admin:feature-flags`, `admin:api-keys`, all `system:*`)
  - `MEMBER`: Limited read permissions (`user:read`, `tenant:read`)
  - `GUEST`: Minimal read permissions (`user:read` only)

- Export both `Permissions` and `RolePermissions` for use in:
  - `apps/api/src/auth/guards/permissions.guard.ts` (import and use)
  - `packages/shared/src/admin/*.schema.ts` (validate against known permissions)

**Refactoring Required:**
- Update `apps/api/src/auth/guards/permissions.guard.ts` to import `RolePermissions` from `@repo/shared` instead of hardcoding
- Ensure the guard uses the imported map for permission checking

**Verification:**
- All permissions are properly typed
- RolePermissions mapping covers all roles
- No duplicate permission strings
- `billing:*` permissions are removed
- Existing `PermissionsGuard` imports from shared package
- Exports are correctly set up

---

### 0.2.2 Update Seed Script with SUPER_ADMIN User

**Objective:** Add a default super admin user to the existing seed script for initial access.

**File Location:** `packages/database/prisma/seed.ts`

**Requirements:**
- **Update existing seed script** (do not create a new one — the file already seeds `admin@example.com` and `member@example.com`)
- Add a default super admin user:
  - Email: `superadmin@example.com`
  - Password: `SuperAdmin123!` (hashed with argon2)
  - Name: `Super Admin`
  - Role: `SUPER_ADMIN`
  - Status: `ACTIVE`
- Create an `AuthenticationProvider` record with `type: AuthProviderType.LOCAL` (note: the field is `type`, not `provider`)
- Create a default Tenant:
  - Name: `System Tenant`
  - Slug: `system`
- Create `UserTenant` relation linking super admin to system tenant
- Ensure seed remains idempotent (uses `upsert` — can run multiple times)
- Add confirmation logs (console.log) showing what was created

**Verification:**
- Seed runs without errors
- Super admin can log in with provided credentials
- Super admin has access to all admin routes
- Tenant is created successfully
- Relations are properly established
- Existing seeded users (admin, member) are not affected

---

### 0.2.3 Extend Existing Guards and Add OR-Logic Decorator

**Objective:** Extend the existing guard/decorator system to support admin-specific needs without creating duplicate abstractions. Only add genuinely new functionality.

**File Locations:**
- `apps/api/src/auth/decorators/require-any-permission.decorator.ts` (NEW)
- `apps/api/src/auth/guards/permissions.guard.ts` (UPDATE)

**Existing Infrastructure (DO NOT duplicate):**
The following already exist and should be reused as-is:
- `@Public()` decorator + `JwtAuthGuard` respects it — use for admin public routes
- `@Roles(...roles)` decorator + `RolesGuard` — use for role-based access (e.g., `@Roles(Role.SUPER_ADMIN, Role.ADMIN)`)
- `@Permissions(...perms)` decorator + `PermissionsGuard` — use for AND-logic permission checking

**New Additions:**

**1. `@RequireAnyPermission(...permissions: string[])` decorator (NEW):**
- **File:** `apps/api/src/auth/decorators/require-any-permission.decorator.ts`
- Sets metadata key `REQUIRE_ANY_PERMISSION_KEY`
- Used for routes where user needs ANY one of the specified permissions (OR logic)
- Example: `@RequireAnyPermission('tenant:write', 'tenant:delete')` — user needs either permission

**2. Update `PermissionsGuard` to support OR logic:**
- **File:** `apps/api/src/auth/guards/permissions.guard.ts`
- Add support for `REQUIRE_ANY_PERMISSION_KEY` metadata
- Logic:
  - If `@Permissions(...)` is set → require ALL (existing AND logic, unchanged)
  - If `@RequireAnyPermission(...)` is set → require ANY (new OR logic)
  - If both are set → both conditions must pass (AND between the two checks)
- Return 403 with missing permission details when check fails

**Admin Access Pattern:**
Admin controllers should apply guards at the controller level:
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AdminController {
  // All routes require authentication + SUPER_ADMIN or ADMIN role
  // Individual routes can add @Permissions() or @RequireAnyPermission() for fine-grained access
}
```

**Verification:**
- Existing `@Permissions()` decorator still works (AND logic unchanged)
- New `@RequireAnyPermission()` decorator works (OR logic)
- Both can be used on the same route if needed
- `@Roles()` and `@Public()` continue to work as before
- No duplicate decorators or guards created
- Admin controllers can be secured with controller-level `@UseGuards()` + `@Roles()`

---

### 0.2.4 Setup Admin Module Structure

**Objective:** Create the foundation for admin module with proper dependency injection and guard application.

**File Location:** `apps/api/src/admin/admin.module.ts`

**Requirements:**
- Create `AdminModule` with:
  - `AdminController` (base controller for admin routes)
  - `AdminService` (shared admin utilities)
  - Import `DatabaseModule` for Prisma access
- Create `AdminModuleOptions` interface for configuration
- Set up global prefix for admin routes: `/api/v1/admin` (note: global prefix is already `api/v1`, so admin routes will be at `/api/v1/admin/*`)
- **Apply guards at controller level** (not globally):
  - Use `@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard)` on `AdminController`
  - Use `@Roles(Role.SUPER_ADMIN, Role.ADMIN)` on `AdminController` to restrict all admin routes
  - This ensures all routes in the admin module require authentication + admin role
- Create sub-modules for each feature (scaffold empty modules in Phase 0, implement in later phases):
  - `TenantAdminModule`
  - `UserAdminModule`
  - `RoleAdminModule`
  - `AuditAdminModule`
  - `SystemAdminModule`

**Note on Existing Admin Routes:**
- The current `TenantModule` has admin-only routes (`POST /tenants`, `GET /tenants` with `@Roles(Role.SUPER_ADMIN)`)
- These will remain in `TenantModule` for now and be migrated to `TenantAdminModule` in Phase 1+ when building the admin UI
- Do not move them in Phase 0 to keep scope minimal

**Verification:**
- Module compiles without errors
- Dependencies are properly injected
- Routes are accessible at `/api/v1/admin/*`
- Guards are correctly applied at controller level
- Sub-modules are imported (even if empty)
- Existing `TenantModule` admin routes still work

---

## Task 0.3: Shared Schemas

### 0.3.1 Create Admin Zod Schemas in `@repo/shared`

**Objective:** Define validation schemas for all admin operations.

**File Locations:**
- `packages/shared/src/admin/tenant.schema.ts`
- `packages/shared/src/admin/user.schema.ts`
- `packages/shared/src/admin/role.schema.ts`
- `packages/shared/src/admin/system.schema.ts`
- `packages/shared/src/admin/audit.schema.ts`

**Requirements:**

**Tenant Schemas (`tenant.schema.ts`):**
- `createTenantSchema`: name, slug, adminEmail, plan (optional)
  - Validate slug format (lowercase, hyphens only)
  - Validate email for admin user
- `updateTenantSchema`: Partial of create schema
- `tenantResponseSchema`: Include all fields with relations

**User Schemas (`user.schema.ts`):**
- `createUserSchema`: email, name, password, tenantId, role
- `updateUserSchema`: name, email, role, status, tenantIds
- `userListQuerySchema`: page, limit, search, tenantId, role, status
- `userResponseSchema`: Include user with tenant relations

**Role Schemas (`role.schema.ts`):**
- `createRoleSchema`: name, description, permissions
  - Validate permissions against known list
- `updateRoleSchema`: Partial of create schema
- `roleResponseSchema`: Include assigned user count

**System Schemas (`system.schema.ts`):**
- `featureFlagSchema`: key, name, description, enabled, tenantId
- `systemConfigSchema`: key, value, description
- `maintenanceSchema`: enabled, message, scheduledEnd

**Audit Schemas (`audit.schema.ts`):**
- `auditLogQuerySchema`: page, limit, userId, tenantId, action, from, to
- `auditLogResponseSchema`: Full audit log with user details

**Verification:**
- All schemas compile without TypeScript errors
- Zod validation works correctly
- Inferred types are properly exported
- Schemas handle edge cases (optional fields, validation messages)

---

### 0.3.2 Export Admin Types and Validation Schemas

**Objective:** Make all admin schemas available through the shared package entry point.

**File Location:** `packages/shared/src/index.ts`

**Requirements:**
- Add exports for all admin schemas and types:
  ```typescript
  export * from './admin/permissions';
  export * from './admin/tenant.schema';
  export * from './admin/user.schema';
  export * from './admin/role.schema';
  export * from './admin/system.schema';
  export * from './admin/audit.schema';
  ```
- Re-export all schema types for consuming apps
- Ensure backward compatibility with existing exports
- Run build to verify no import/export errors

**Verification:**
- All exports resolve correctly
- `@repo/shared` builds without errors
- Types are available in consuming apps (Next.js and NestJS)
- IDE autocomplete works for admin schemas
- No duplicate exports or naming conflicts

---

## Phase 0 Verification Checklist

Before proceeding to Phase 1, verify:

- [ ] All database migrations applied successfully
- [ ] Prisma client regenerated with all new models (using `cuid()` IDs)
- [ ] Seed script runs and creates super admin (updates existing seed)
- [ ] Super admin can log in with provided credentials
- [ ] Permission matrix is defined in `@repo/shared` and exported
- [ ] `billing:*` permissions are removed from the system
- [ ] Existing `PermissionsGuard` imports `RolePermissions` from `@repo/shared`
- [ ] `@RequireAnyPermission` decorator works (OR logic)
- [ ] Existing `@Permissions` decorator still works (AND logic)
- [ ] Admin module structure is set up with controller-level guards
- [ ] All Zod schemas compile and validate
- [ ] Shared package exports all admin schemas and permissions
- [ ] `pnpm build` succeeds with no errors
- [ ] `pnpm lint` passes with no critical errors
- [ ] `pnpm test` passes all existing tests

---

## Phase 0 Completion Criteria

- [ ] Database contains all 5 new models with proper relations (using `cuid()` IDs)
- [ ] Migration file is generated and verified
- [ ] Seed script updated to create super admin user with system tenant
- [ ] Permission matrix defines 20+ permissions across 5 resources (no `billing:*`)
- [ ] Permission constants moved to `@repo/shared/src/admin/permissions.ts`
- [ ] Existing `PermissionsGuard` refactored to import from shared package
- [ ] `@RequireAnyPermission` decorator added for OR logic
- [ ] Admin module is registered in AppModule with controller-level guards
- [ ] All admin schemas are created and exported from `@repo/shared`
- [ ] Code compiles without errors
- [ ] ESLint passes with no errors
- [ ] No existing tests are broken
- [ ] Existing `TenantModule` admin routes still work (not migrated yet)

---

## Phase 0 Tips & Best Practices

1. **Model Relationships:** Ensure all foreign keys have proper `@relation` attributes
2. **Indexing:** Add indexes on fields used in WHERE clauses (tenantId, userId, action, createdAt)
3. **Permission Strings:** Use consistent format: `resource:action` (e.g., `tenant:write`)
4. **Error Handling:** Include descriptive error messages in validation schemas
5. **Type Safety:** Use inferred types from Zod schemas in controllers
6. **Testing:** Test each model and guard implementation as you go

---

**Ready for Phase 1?** Let me know when Phase 0 is complete!