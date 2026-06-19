# Phase 3: User Management — Complete Instructions

## Overview
This phase implements comprehensive cross-tenant user management capabilities. You'll build backend CRUD operations, user lifecycle management (suspend/activate, password reset), multi-tenant assignment, role management, and a complete frontend interface with advanced filtering, bulk actions, and activity history.

---

## Task 3.1: Backend - User CRUD

### 3.1.1 AdminUserController Endpoints

**Objective:** Create REST API endpoints for global user management operations.

**File Location:** `apps/api/src/admin/user/user-admin.controller.ts`

**Requirements:**

- **Controller Setup:**
  - Use `@Controller('admin/users')` decorator
  - Apply `@UseGuards(AdminAuthGuard, AdminPermissionsGuard)` for all endpoints
  - Set API versioning (v1) via global prefix
  - Use `@RequirePermission` decorators for fine-grained access

- **Endpoint Definitions:**

  **List Users:**
  - `GET /api/v1/admin/users`
  - Query parameters:
    - `page` (default: 1)
    - `limit` (default: 20, max: 100)
    - `search` (search by name, email)
    - `tenantId` (filter by tenant)
    - `role` (filter by role: SUPER_ADMIN, ADMIN, MEMBER, GUEST)
    - `status` (filter by status: ACTIVE, SUSPENDED, PENDING)
    - `sortBy` (name, email, createdAt, lastLogin)
    - `sortOrder` (asc, desc)
    - `includeDeleted` (boolean, default: false)
  - Response: Paginated list with user data and metadata

  **Get User:**
  - `GET /api/v1/admin/users/:id`
  - Include related data:
    - Tenants (with roles)
    - Authentication providers
    - Recent activity (last 10 audit logs)
    - Active sessions count
  - Return 404 if user not found

  **Create User:**
  - `POST /api/v1/admin/users`
  - Body: `CreateUserDto` (email, name, password, tenantId, role)
  - Validate email uniqueness (globally)
  - Validate tenant exists (if provided)
  - Validate role is valid (must match Role enum)
  - Create user with authentication provider
  - Assign to tenant with specified role
  - Return created user with tenant assignment

  **Update User:**
  - `PATCH /api/v1/admin/users/:id`
  - Body: `UpdateUserDto` (partial update)
  - Validate email uniqueness (if changed)
  - Prevent updating system users (if applicable)
  - Return updated user

  **Delete User:**
  - `DELETE /api/v1/admin/users/:id`
  - Soft delete (set deletedAt)
  - Or hard delete with data handling options
  - Prevent deleting self
  - Return success message

- **Request/Response Validation:**
  - Use Zod schemas from `@repo/shared` for DTO validation
  - Apply `UseSchema` decorator for validation
  - Use `UseResponseSchema` for consistent responses

- **Error Handling:**
  - 400: Validation errors (invalid data)
  - 404: User not found
  - 409: Email conflict (already exists)
  - 403: Insufficient permissions (e.g., trying to delete self)

**Verification:**
- [ ] All endpoints are properly decorated
- [ ] Guards apply to all endpoints
- [ ] Request validation works with Zod schemas
- [ ] Pagination works correctly
- [ ] Search and filtering work
- [ ] Proper error responses are returned
- [ ] API documentation (Swagger) is generated

---

### 3.1.2 AdminUserService Business Logic

**Objective:** Implement core business logic for user operations.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with Prisma client
  - Inject `AuditLogService` for logging
  - Inject `TenantAdminService` for tenant validation
  - Inject `EmailService` for notifications

- **Core Methods:**

  **`findAll(params: UserListParams)`**
  - Build dynamic where clause based on filters
  - Use Prisma's `$transaction` for count + data
  - Include tenant relations with roles
  - Apply search on name and email (case-insensitive)
  - Exclude soft-deleted by default
  - Sort by specified field
  - Return paginated result with total count

  **`findById(id: string)`**
  - Fetch user with relations:
    - Tenants (with roles via UserTenant)
    - Authentication providers (mask password)
    - Recent audit logs (last 10)
  - Throw NotFoundException if not found
  - Return formatted user detail object

  **`create(data: CreateUserDto)`**
  - Check email uniqueness
  - Validate tenant exists (if tenantId provided)
  - Validate role is valid
  - Hash password with argon2
  - Start database transaction:
    1. Create User record
    2. Create AuthenticationProvider (LOCAL)
    3. Create UserTenant relation (if tenant provided)
  - Send welcome email (async)
  - Log to audit: "user.created"
  - Return user with tenant assignment

  **`update(id: string, data: UpdateUserDto)`**
  - Check user exists
  - Validate email uniqueness (if changed)
  - If updating role, check if allowed
  - If updating tenant assignments, handle carefully
  - Update user fields
  - Log to audit: "user.updated"
  - Return updated user

  **`delete(id: string, options: DeleteOptions)`**
  - Check user exists
  - Prevent deleting self (super admin)
  - If `softDelete`: set `deletedAt` timestamp
  - If `hardDelete`: cascade delete with options:
    - `deleteAllData`: delete all user data
    - `anonymizeData`: anonymize personal data
    - `transferData`: transfer to another user
  - Log to audit with deletion method
  - Return success status

- **Helper Methods:**
  - `validateEmail(email: string)`: check format and uniqueness
  - `validateRole(role: Role)`: check if role is valid
  - `hashPassword(password: string)`: use argon2
  - `generateTemporaryPassword()`: generate secure temp password
  - `isSystemUser(id: string)`: check if user is protected

- **Transaction Management:**
  - Use `$transaction` for operations spanning multiple models
  - Ensure atomic operations
  - Rollback on any error

**Verification:**
- [ ] All methods handle errors gracefully
- [ ] Transactions work correctly
- [ ] Email validation prevents duplicates
- [ ] Audit logs are created for all operations
- [ ] Delete operations respect options
- [ ] Service methods are properly typed

---

### 3.1.3 Global User Listing with Filters

**Objective:** Provide comprehensive user list with advanced filtering capabilities.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts` (extend previous)

**Requirements:**

- **Filter Implementation:**
  - **Search:** Search by name and email (OR condition)
  - **Tenant:** Filter by tenantId (users in specific tenant)
  - **Role:** Filter by role (AND condition)
  - **Status:** Filter by user status
  - **Date Range:** Filter by createdAt
  - **Last Login:** Filter by last login date
  - **Has Tenant:** Filter users with/without tenant assignment
  - **Email Verified:** Filter by email verification status

- **Advanced Filters:**
  - **Multi-select:** Support multiple values (e.g., multiple roles)
  - **Exclusion:** Filter out specific users (e.g., exclude self)
  - **Custom Fields:** Support custom user fields (if implemented)

- **Performance Optimization:**
  - Use database indexes on: email, role, status, createdAt
  - Use `SELECT` with specific fields (not `*`)
  - Use `_count` for relation counts
  - Implement cursor-based pagination for large datasets

- **Response Format:**
  ```typescript
  {
    data: UserListItem[],
    meta: {
      total: number,
      page: number,
      limit: number,
      totalPages: number,
      hasNextPage: boolean,
      hasPreviousPage: boolean
    },
    filters: {
      applied: FilterSummary
    }
  }
  ```

**Verification:**
- [ ] All filters work correctly
- [ ] Search works across name and email
- [ ] Multi-select filters work
- [ ] Pagination metadata is accurate
- [ ] Performance is acceptable (< 500ms)
- [ ] Database indexes are used

---

### 3.1.4 User Update with Tenant Assignment

**Objective:** Handle user updates including tenant role changes.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts` (extend previous)

**Requirements:**

- **Update Flow:**
  1. Validate user exists
  2. Validate update data
  3. Check permissions (can't update self in some cases)
  4. Handle tenant assignments if provided:
     - **Add tenant:** Create UserTenant relation
     - **Remove tenant:** Delete UserTenant relation
     - **Change role:** Update UserTenant role
     - **Bulk replace:** Replace all tenant assignments
  5. Handle email change (validate uniqueness)
  6. Handle role change (validate permissions)
  7. Start transaction
  8. Apply updates
  9. Log to audit
  10. Return updated user

- **Tenant Assignment Rules:**
  - User must have at least one tenant (unless system user)
  - Cannot remove last tenant if user has data
  - Role must be valid for tenant
  - Super admin can be assigned to any tenant

- **Bulk Tenant Operations:**
  - `addTenants(userId, tenantIds, role)`
  - `removeTenants(userId, tenantIds)`
  - `setTenants(userId, assignments[])` (replace all)

- **Validation:**
  - Prevent removing self from system tenant
  - Prevent demoting self from SUPER_ADMIN
  - Validate tenant exists before assignment

**Verification:**
- [ ] Tenant assignments can be added/removed
- [ ] Role updates work
- [ ] Bulk tenant operations work
- [ ] Validation prevents invalid operations
- [ ] Audit logs capture changes
- [ ] Transactions ensure atomicity

---

### 3.1.5 User Deletion with Data Handling

**Objective:** Implement user deletion with configurable data handling.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts` (extend previous)

**Requirements:**

- **Deletion Options:**
  - **Soft Delete (Default):**
    - Set `deletedAt` timestamp
    - Set `deletedBy` (who deleted)
    - Keep all data intact
    - User cannot log in
    - Can be restored

  - **Hard Delete:**
    - Permanently delete user record
    - Cascade delete related data
    - Irreversible

  - **Anonymize:**
    - Anonymize name: "Deleted User [UUID]"
    - Anonymize email: `user-[uuid]@deleted.com`
    - Remove profile image
    - Clear authentication provider (except hash)
    - Keep analytics data

  - **Data Transfer:**
    - Transfer all user data to another user
    - Useful for GDPR compliance
    - Requires target user ID

- **Cascade Options:**
  - `cascadeSessions`: Invalidate all sessions
  - `cascadeApiKeys`: Revoke all API keys
  - `cascadeAuditLogs`: Anonymize or delete audit logs
  - `cascadeTenantRelations`: Remove from all tenants

- **GDPR Compliance:**
  - Support data export before deletion
  - Support right to be forgotten
  - Log deletion for compliance
  - Retention period for deletion requests

- **Restore Functionality:**
  - Restore soft-deleted users
  - Restore tenant assignments
  - Reactivate authentication provider
  - Send reactivation notification

**Verification:**
- [ ] All deletion options work
- [ ] Soft delete prevents login
- [ ] Hard delete removes all data
- [ ] Anonymize protects personal data
- [ ] Data transfer works
- [ ] Restore works for soft-deleted users
- [ ] GDPR compliance features work
- [ ] Audit logs capture all deletions

---

## Task 3.2: Backend - User Lifecycle

### 3.2.1 Suspend/Activate Users

**Objective:** Implement user suspension and activation functionality.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts`

**Requirements:**

- **Suspend Flow:**
  1. Validate user exists
  2. Prevent suspending self
  3. Validate user is not already suspended
  4. Start transaction:
     - Update user status: `SUSPENDED`
     - Invalidate all sessions (refresh tokens)
     - Revoke all API keys
     - Log suspension reason
  5. Send notification email (async)
  6. Log to audit: "user.suspended"
  7. Return user with new status

- **Activate Flow:**
  1. Validate user exists
  2. Validate user is suspended
  3. Start transaction:
     - Update user status: `ACTIVE`
     - DO NOT restore sessions (security)
     - Reactivate API keys (optional)
  4. Send notification email (async)
  5. Log to audit: "user.activated"
  6. Return user with new status

- **Reasons for Suspension:**
  - "policy_violation": TOS violation
  - "abuse": Abusive behavior
  - "inactive": Inactivity (optional)
  - "security_concern": Suspicious activity
  - "other": Custom reason
  - Required field in API

- **Bulk Suspension:**
  - Support suspending multiple users at once
  - Apply same reason to all
  - Process in batches
  - Show progress

**Verification:**
- [ ] Suspend prevents user login
- [ ] All sessions are invalidated
- [ ] API keys are revoked
- [ ] Notification email is sent
- [ ] Activate works correctly
- [ ] Bulk suspension works
- [ ] Audit logs capture actions
- [ ] Cannot suspend self

---

### 3.2.2 Force Password Reset

**Objective:** Allow admins to force password reset for users.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts`

**Requirements:**

- **Force Reset Flow:**
  1. Validate user exists
  2. Prevent resetting own password (use dedicated change password endpoint)
  3. Generate secure reset token
  4. Store token with expiration (24 hours)
  5. Send password reset email
  6. Log to audit: "user.password_reset_forced"
  7. Invalidate all sessions (security)
  8. Return success (don't expose token)

- **Reset Token Management:**
  - Create `PasswordResetToken` model or use existing
  - Token: secure random string (32 bytes)
  - Expiration: 24 hours from creation
  - Single-use (delete on use)
  - Store hashed token in database

- **Email Template:**
  - Subject: "Password Reset Requested by Admin"
  - Body: "An admin has requested a password reset for your account"
  - Include reset link with token
  - Include "If you didn't request this, contact support"
  - Include admin contact information

- **Bulk Password Reset:**
  - Support resetting passwords for multiple users
  - Send individual emails
  - Log each reset

- **Password Change After Reset:**
  - Enforce password policy on reset
  - Force user to change password on next login (if configured)
  - Use existing password reset flow

**Verification:**
- [ ] Reset token is generated
- [ ] Email is sent
- [ ] All sessions are invalidated
- [ ] Audit log captures event
- [ ] Bulk reset works
- [ ] Token expires after 24 hours
- [ ] Password policy is enforced

---

### 3.2.3 User Roles Management

**Objective:** Manage user roles across tenants.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts`

**Requirements:**

- **Role Assignment:**
  - **Assign Role:** `assignRole(userId, tenantId, role)`
    - Validate user exists
    - Validate tenant exists
    - Validate user belongs to tenant
    - Update UserTenant role
    - Log to audit
  
  - **Bulk Assign Role:** Assign role to multiple users in a tenant
    - Apply to all selected users
    - Validate all users belong to tenant
    - Update all UserTenant records
  
  - **Remove Role:** Remove user from tenant (effectively removing role)
    - Validate user has other tenants (if not, prevent removal)
    - Delete UserTenant relation

- **Role Validation:**
  - Role must exist in Role enum
  - Cannot assign SUPER_ADMIN to non-system tenant users (optional)
  - Cannot demote last admin in tenant (prevent orphan tenant)
  - Cannot change self role (use dedicated endpoint)

- **Role History:**
  - Track role changes in audit log
  - Show history in user detail
  - Allow viewing previous roles

- **Role-Based Permissions:**
  - User permissions are determined by:
    - Global role (User.role)
    - Tenant-specific role (UserTenant.role)
  - Resolve effective permissions

**Verification:**
- [ ] Role assignment works
- [ ] Bulk role assignment works
- [ ] Role removal works
- [ ] Validation prevents invalid assignments
- [ ] Audit logs capture changes
- [ ] Role history is tracked
- [ ] Effective permissions are resolved

---

### 3.2.4 Multi-Tenant User Assignment

**Objective:** Manage user membership across multiple tenants.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts`

**Requirements:**

- **Add to Tenant:**
  - `addToTenant(userId, tenantId, role)`
  - Check if user is already in tenant (prevent duplicates)
  - Validate tenant exists
  - Create UserTenant relation with role
  - Log to audit: "user.added_to_tenant"
  - Send notification (optional)

- **Remove from Tenant:**
  - `removeFromTenant(userId, tenantId)`
  - Prevent removing self from all tenants
  - Prevent removing last admin from tenant
  - Delete UserTenant relation
  - Log to audit: "user.removed_from_tenant"
  - Send notification (optional)

- **Batch Operations:**
  - Add multiple users to tenant
  - Remove multiple users from tenant
  - Move users between tenants

- **Tenant Switch:**
  - Allow users to switch active tenant
  - Update session/context
  - Log tenant switch

- **Validation Rules:**
  - User must have at least one tenant (unless system user)
  - Cannot assign user to tenant if user is suspended
  - Cannot assign user to tenant if tenant is suspended
  - Role must be valid for tenant

**Verification:**
- [ ] Add to tenant works
- [ ] Remove from tenant works
- [ ] Batch operations work
- [ ] Validation prevents invalid assignments
- [ ] Audit logs capture changes
- [ ] Notifications are sent
- [ ] Tenant switch works

---

### 3.2.5 User Search and Filtering

**Objective:** Implement advanced search and filtering for user lists.

**File Location:** `apps/api/src/admin/user/user-admin.service.ts`

**Requirements:**

- **Search Functionality:**
  - Search by name (partial, case-insensitive)
  - Search by email (partial, case-insensitive)
  - Search by tenant name (via relation)
  - Search by role (exact match)
  - Full-text search (PostgreSQL tsvector)

- **Filter Options:**
  - **Tenant:** Filter by tenant ID
  - **Role:** Filter by role (single or multiple)
  - **Status:** Filter by status (ACTIVE, SUSPENDED, PENDING)
  - **Date Range:** Created between dates
  - **Last Login:** Within date range
  - **Has Tenant:** With/without tenant assignment
  - **Email Verified:** Verified or not
  - **With Deleted:** Include soft-deleted users

- **Sorting Options:**
  - Name (asc/desc)
  - Email (asc/desc)
  - Created date (asc/desc)
  - Last login (asc/desc)
  - Role (asc/desc)

- **Implementation:**
  - Build dynamic Prisma where clause
  - Use Prisma's `OR` for search across multiple fields
  - Use `AND` for combining filters
  - Use `_count` for relation filtering

- **Performance:**
  - Use database indexes on all filter fields
  - Implement search caching
  - Use PostgreSQL full-text search for large datasets

**Verification:**
- [ ] Search works across all fields
- [ ] Filters combine correctly
- [ ] Sorting works for all fields
- [ ] Pagination works with filters
- [ ] Performance is acceptable (< 300ms)
- [ ] Full-text search works (if implemented)

---

## Task 3.3: Frontend - User Pages

### 3.3.1 User List with DataTable

**Objective:** Build a comprehensive user list view with data table.

**File Location:** `apps/web/src/app/admin/users/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/admin/users`
  - Layout: Admin layout with sidebar
  - Page header: "Users" with "Create User" button
  - Data table with sortable columns
  - Pagination controls
  - Filter bar

- **DataTable Columns:**
  - **User**: Name with avatar and email below
  - **Tenants**: List of tenants with role badges
  - **Role**: User's primary role (or role in current tenant)
  - **Status**: Badge (Active/Suspended/Pending) with color coding
  - **Created**: Date with relative time
  - **Last Login**: Date with relative time
  - **Actions**: Dropdown menu

- **Table Features:**
  - Column sorting (click on header)
  - Row selection (checkbox)
  - Resizable columns
  - Column visibility toggle
  - Export to CSV button

- **State Management:**
  - Use TanStack Table (react-table) for data table
  - Manage pagination state (page, pageSize)
  - Manage sorting state
  - Manage filter state

- **Server-Side Fetching:**
  - Use `useEffect` or `useSWR` for data fetching
  - Cache responses
  - Show loading skeleton
  - Handle error states

**Verification:**
- [ ] Table renders correctly
- [ ] Data is loaded from API
- [ ] Sorting works
- [ ] Pagination works
- [ ] Row selection works
- [ ] Status badges are correct
- [ ] Actions dropdown works
- [ ] Loading states show skeleton
- [ ] Error states show message

---

### 3.3.2 Create User Form (with Tenant/Role Selection)

**Objective:** Build a form for creating new users with tenant assignment.

**File Location:** `apps/web/src/app/admin/users/create/page.tsx`

**Requirements:**

- **Form Fields:**
  - **Email** (required): Email input
    - Validation: valid email format
    - Check if email already exists
  - **Name** (required): Text input
    - Validation: min 2 chars, max 100 chars
  - **Password** (required): Password input
    - Validation: password policy (min 12 chars, etc.)
    - Show password strength meter
    - Toggle show/hide
  - **Confirm Password** (required): Password input
    - Validation: matches password
  - **Tenant Assignment** (required): Searchable select
    - Search by tenant name or slug
    - Show tenant details on hover
    - Support selecting multiple tenants
  - **Role** (required): Select dropdown
    - Options: ADMIN, MEMBER, GUEST
    - Show description for each role
    - Disable SUPER_ADMIN for non-system tenants

- **Form Behavior:**
  - Client-side validation with Zod
  - Real-time validation feedback
  - Check email availability on blur
  - Show password strength meter
  - Tenant selection with search

- **Submit Handling:**
  - Use server action: `createUserAction`
  - Show loading state on submit
  - Disable form during submission
  - On success: redirect to user detail
  - On error: display error message

**Verification:**
- [ ] All form fields render correctly
- [ ] Validation works in real-time
- [ ] Email availability check works
- [ ] Tenant search works
- [ ] Role selection works
- [ ] Form submits successfully
- [ ] Error messages are displayed
- [ ] Loading states work
- [ ] Redirect on success

---

### 3.3.3 User Detail View with Session Info

**Objective:** Display comprehensive user information and session details.

**File Location:** `apps/web/src/app/admin/users/[id]/page.tsx`

**Requirements:**

- **Page Layout:**
  - Route: `/admin/users/:id`
  - Header with user name, avatar, and actions
  - Tabs: Overview, Tenants, Activity, Sessions

- **Overview Tab:**
  - **User Profile:**
    - Avatar, name, email
    - Status badge
    - Created date
    - Last login
  - **Summary Cards:**
    - Tenant count
    - Role in each tenant
    - API keys count
    - Active sessions count
  - **Recent Activity:**
    - Last 10 audit logs
    - Login history

- **Tenants Tab:**
  - List of tenants user belongs to
  - Role in each tenant
  - Joined date
  - Actions: change role, remove from tenant

- **Activity Tab:**
  - Full audit log for user
  - Filter by action type
  - Date range filter
  - Pagination

- **Sessions Tab:**
  - List of active sessions
  - Device info, IP, last activity
  - Revoke session button
  - Revoke all sessions button

**Verification:**
- [ ] All tabs render correctly
- [ ] User profile information is accurate
- [ ] Tenant list shows correctly
- [ ] Activity log works
- [ ] Session list shows active sessions
- [ ] Session revocation works
- [ ] Loading and error states work
- [ ] Responsive design works

---

### 3.3.4 Edit User Form (with Tenant Management)

**Objective:** Create an edit form for updating user information and tenant assignments.

**File Location:** `apps/web/src/app/admin/users/[id]/edit/page.tsx`

**Requirements:**

- **Form Fields:**
  - **Email** (required): Email input
    - Show warning: "Changing email will affect all tenants"
  - **Name** (required): Text input
  - **Tenant Assignments**: Manage tenants
    - Current tenants with roles (chips)
    - Add tenant: search and select
    - Remove tenant: X button on chip
    - Change role: dropdown in chip
  - **Role** (optional): Global role (for system users)

- **Edit Behavior:**
  - Pre-populate form with existing data
  - Show "Save" and "Cancel" buttons
  - Dirty state detection (warn on navigation)
  - Tenant management in real-time

- **Validation:**
  - Same as create form
  - Email uniqueness check
  - Prevent removing self from all tenants
  - Prevent demoting self from SUPER_ADMIN

- **Success/Error Handling:**
  - Show success toast: "User updated"
  - Redirect to detail view on success
  - Show error toast with message

**Verification:**
- [ ] Form is pre-populated with data
- [ ] Validation works for all fields
- [ ] Tenant management works
- [ ] Save updates the user
- [ ] Dirty state works
- [ ] Cancel redirects correctly
- [ ] Success/error toasts appear

---

### 3.3.5 User Actions Menu

**Objective:** Implement action buttons with confirmation dialogs.

**File Location:** `apps/web/src/components/admin/user-actions.tsx`

**Requirements:**

- **Action Components:**
  - Create dropdown menu with all actions
  - Different actions based on user status

- **Suspend Action:**
  - Open confirmation dialog
  - Show warning: "User will not be able to log in"
  - Require reason text input (required)
  - Checkbox: "Send notification to user"
  - Confirm button: "Suspend User"
  - On success: show toast, update status

- **Activate Action:**
  - Open confirmation dialog
  - Show info: "User will be reactivated"
  - Checkbox: "Send notification to user"
  - Confirm button: "Activate User"
  - On success: show toast, update status

- **Force Password Reset:**
  - Open confirmation dialog
  - Show info: "User will receive password reset email"
  - Confirm button: "Send Reset Email"
  - On success: show toast

- **Delete Action:**
  - Open confirmation dialog
  - Show danger warning: "This action may be irreversible"
  - Require typing user email to confirm
  - Options: Soft delete vs Hard delete
  - Data retention options
  - Confirm button: "Delete User" (red)
  - On success: redirect to user list

- **Impersonate Action (if implemented):**
  - Open confirmation dialog
  - Show warning: "You will be logged in as this user"
  - Log reason (for audit)
  - Confirm button: "Impersonate User"

**Verification:**
- [ ] All actions have confirmation dialogs
- [ ] Suspend works with reason
- [ ] Activate works
- [ ] Force password reset works
- [ ] Delete requires confirmation
- [ ] Impersonate works (if implemented)
- [ ] Error handling works
- [ ] Toast notifications appear
- [ ] Audit logs capture actions

---

## Task 3.4: Frontend - Advanced UI

### 3.4.1 User Filter Bar (Tenant, Role, Status)

**Objective:** Build an advanced filter interface for user list.

**File Location:** `apps/web/src/components/admin/user-filters.tsx`

**Requirements:**

- **Filter Components:**
  - **Search Bar**: Search by name, email with debounce
  - **Tenant Filter**: Searchable dropdown with all tenants
  - **Role Filter**: Multi-select dropdown with all roles
  - **Status Filter**: Multi-select dropdown with statuses
  - **Date Range**: Date picker for createdAt range

- **Advanced Filters:**
  - **Last Login**: Preset ranges (Today, Week, Month, Custom)
  - **Has Tenant**: Toggle for users with/without tenant
  - **Email Verified**: Toggle for verified users
  - **Includes Deleted**: Toggle for soft-deleted users

- **Filter UI:**
  - Expandable filter panel
  - Active filters display (chips)
  - Click chip to remove filter
  - "Clear All" button
  - "Apply" button (or auto-apply)

- **Filter Persistence:**
  - Store filters in URL query parameters
  - Allow sharing filtered views
  - Restore filters on page reload
  - Bookmark filters

**Verification:**
- [ ] All filters render correctly
- [ ] Search works with debounce
- [ ] Tenant filter works
- [ ] Role multi-select works
- [ ] Status multi-select works
- [ ] Date range works
- [ ] Filters apply to API request
- [ ] URL query parameters update
- [ ] Filter chips show active filters

---

### 3.4.2 Bulk User Actions

**Objective:** Implement bulk actions for multiple users.

**File Location:** `apps/web/src/components/admin/bulk-user-actions.tsx`

**Requirements:**

- **Selection:**
  - Checkbox column in data table
  - "Select all" checkbox
  - Selected count display
  - Bulk actions bar appears when items selected

- **Bulk Actions:**
  - **Bulk Suspend**:
    - Show confirmation dialog
    - Require reason (applied to all)
    - Show affected user count
    - Process in batches
  - **Bulk Activate**:
    - Show confirmation dialog
    - Show affected user count
    - Process in batches
  - **Bulk Delete**:
    - Show danger confirmation
    - Require type "DELETE" to confirm
    - Show affected user count
    - Process with options
  - **Bulk Role Assign**:
    - Select target tenant (optional)
    - Select role
    - Apply to all selected users
  - **Bulk Add to Tenant**:
    - Select tenant
    - Select role
    - Add all selected users to tenant
  - **Bulk Remove from Tenant**:
    - Select tenant
    - Remove all selected users from tenant

- **Processing UI:**
  - Show progress bar for batch operations
  - Show success/failed count
  - Allow cancelling batch operation
  - Provide download of failed items

- **Error Handling:**
  - Show per-item errors
  - Provide retry for failed items
  - Show summary of completed operations

**Verification:**
- [ ] Selection works for all rows
- [ ] Bulk actions bar appears
- [ ] Bulk suspend works
- [ ] Bulk activate works
- [ ] Bulk delete works
- [ ] Bulk role assign works
- [ ] Bulk add/remove tenant works
- [ ] Progress bar shows
- [ ] Error handling works

---

### 3.4.3 User Role Assignment UI

**Objective:** Provide a user-friendly interface for role assignment.

**File Location:** `apps/web/src/components/admin/user-role-assignment.tsx`

**Requirements:**

- **Role Assignment Components:**
  - **User List with Role Select**: Inline role dropdown
  - **Bulk Role Assignment**: Select users, choose role, apply
  - **Tenant Context**: Show role in specific tenant context

- **Role Management:**
  - Display current role with badge
  - Dropdown with all available roles
  - Show role descriptions on hover
  - Show permission count for each role
  - Confirm role change with modal

- **Visual Feedback:**
  - Role change animation
  - Toast notification on success
  - Error state with message
  - Loading state during update

- **Batch Role Assignment:**
  - Select multiple users
  - Bulk assign role
  - Confirm with affected count
  - Show success count

**Verification:**
- [ ] Role dropdown works
- [ ] Role descriptions show
- [ ] Role change confirms
- [ ] Bulk role assignment works
- [ ] Visual feedback works
- [ ] Error handling works
- [ ] Audit logs capture changes

---

### 3.4.4 User Activity History

**Objective:** Display user activity in a detailed timeline.

**File Location:** `apps/web/src/components/admin/user-activity-timeline.tsx`

**Requirements:**

- **Timeline Display:**
  - Chronological view (most recent first)
  - Date separators (Today, Yesterday, This Week, etc.)
  - Each event shows:
    - Icon based on action type
    - Action description
    - Context (tenant, resource)
    - Timestamp (relative + absolute)
    - IP address and user agent (expandable)

- **Event Types:**
  - **Auth Events**: Login, Logout, Failed login
  - **User Events**: Created, Updated, Suspended, Activated
  - **Tenant Events**: Added to tenant, Removed from tenant
  - **Role Events**: Role changed
  - **Session Events**: Session created, Session revoked
  - **Password Events**: Password changed, Reset requested

- **Advanced Features:**
  - Filter by event type (multi-select)
  - Filter by date range
  - Filter by tenant
  - Search within activity description
  - Export to CSV
  - Shareable filtered view

- **Infinite Scroll:**
  - Load more events on scroll
  - Show "Load more" button
  - Loading skeleton

**Verification:**
- [ ] Timeline renders correctly
- [ ] Events show proper icons
- [ ] Date separators work
- [ ] Filtering works
- [ ] Infinite scroll works
- [ ] Search works
- [ ] Export works
- [ ] Loading states work

---

## Phase 3 Verification Checklist

Before proceeding to Phase 4, verify:

- [ ] All API endpoints work correctly
- [ ] User CRUD operations are functional
- [ ] User suspension/activation works
- [ ] Force password reset works
- [ ] Role management works
- [ ] Multi-tenant assignment works
- [ ] Search and filtering work
- [ ] User list page renders with data
- [ ] Create user form works
- [ ] Edit user form works
- [ ] User detail view works
- [ ] All actions have confirmation dialogs
- [ ] Bulk actions work
- [ ] Activity timeline works
- [ ] All tests pass
- [ ] No ESLint errors
- [ ] Build succeeds

---

## Phase 3 Completion Criteria

- [ ] AdminUserController with full CRUD endpoints
- [ ] AdminUserService with business logic
- [ ] Global user listing with filters
- [ ] User update with tenant assignment
- [ ] User deletion with data handling
- [ ] User suspension/activation
- [ ] Force password reset
- [ ] User roles management
- [ ] Multi-tenant user assignment
- [ ] User search and filtering
- [ ] User list with DataTable
- [ ] Create user form with tenant selection
- [ ] User detail view with session info
- [ ] Edit user form with tenant management
- [ ] User actions menu
- [ ] User filter bar
- [ ] Bulk user actions
- [ ] User role assignment UI
- [ ] User activity history
- [ ] Audit logs for all user operations

---

## Phase 3 Tips & Best Practices

1. **Data Privacy:** Always mask/hide sensitive data (passwords, tokens)
2. **Tenant Context:** Clearly show which tenant a user belongs to
3. **Bulk Operations:** Process in batches to avoid timeouts
4. **Audit Logs:** Log ALL user management actions
5. **Email Notifications:** Notify users of critical actions (suspension, password reset)
6. **Error Handling:** Provide clear, actionable error messages
7. **Performance:** Use pagination for large user lists
8. **Real-time Updates:** Use optimistic updates for better UX
9. **Security:** Prevent self-modification and system user modification
10. **GDPR:** Provide data export and deletion options

---

**Ready for Phase 4?** Let me know when Phase 3 is complete!