# Phase 2: Tenant Management — Complete Instructions

## Overview
This phase implements full tenant management capabilities for super administrators. You'll build backend CRUD operations, tenant lifecycle management (suspend/restore), statistics aggregation, and a comprehensive frontend interface with data tables, forms, and advanced UI features.

---

## Task 2.1: Backend - Tenant CRUD

### 2.1.1 AdminTenantController Endpoints

**Objective:** Create REST API endpoints for tenant management operations.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.controller.ts`

**Requirements:**

- **Controller Setup:**
  - Use `@Controller('admin/tenants')` decorator
  - Apply `@UseGuards(AdminAuthGuard, AdminPermissionsGuard)` for all endpoints
  - Set API versioning (v1) via global prefix

- **Endpoint Definitions:**

  **List Tenants:**
  - `GET /api/v1/admin/tenants`
  - Query parameters:
    - `page` (default: 1)
    - `limit` (default: 20, max: 100)
    - `search` (search by name or slug)
    - `status` (active, suspended, all)
    - `sortBy` (name, createdAt, userCount)
    - `sortOrder` (asc, desc)
  - Response: Paginated list with tenant data and metadata

  **Get Tenant:**
  - `GET /api/v1/admin/tenants/:id`
  - Include related data: user count, member list (first 10), activity summary
  - Return 404 if tenant not found

  **Create Tenant:**
  - `POST /api/v1/admin/tenants`
  - Body: `CreateTenantDto` (name, slug, adminEmail, plan)
  - Validate slug uniqueness
  - Validate adminEmail exists or create new user
  - Create tenant and assign admin user
  - Return created tenant with admin user details

  **Update Tenant:**
  - `PATCH /api/v1/admin/tenants/:id`
  - Body: `UpdateTenantDto` (partial update)
  - Validate slug uniqueness (if changed)
  - Prevent updating system tenant (if applicable)
  - Return updated tenant

  **Delete Tenant:**
  - `DELETE /api/v1/admin/tenants/:id`
  - Soft delete (set deletedAt)
  - Or hard delete with data retention options
  - Return success message

- **Request/Response Validation:**
  - Use Zod schemas from `@repo/shared` for DTO validation
  - Apply `UseSchema` decorator for validation
  - Use `UseResponseSchema` for consistent responses

- **Error Handling:**
  - 400: Validation errors (invalid data)
  - 404: Tenant not found
  - 409: Slug conflict (already exists)
  - 403: Insufficient permissions

**Verification:**
- [ ] All endpoints are properly decorated
- [ ] Guards apply to all endpoints
- [ ] Request validation works with Zod schemas
- [ ] Pagination works correctly
- [ ] Search and filtering work
- [ ] Proper error responses are returned
- [ ] API documentation (Swagger) is generated

---

### 2.1.2 AdminTenantService Business Logic

**Objective:** Implement core business logic for tenant operations.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with Prisma client
  - Inject `AuditLogService` for logging
  - Inject `UserAdminService` for user operations

- **Core Methods:**

  **`findAll(params: TenantListParams)`**
  - Build dynamic where clause based on filters
  - Use Prisma's `$transaction` for count + data
  - Include user count via `_count` relation
  - Apply search on name and slug (case-insensitive)
  - Sort by specified field
  - Return paginated result with total count

  **`findById(id: string)`**
  - Fetch tenant with relations:
    - Users (with roles)
    - User count
    - Recent activity (last 5 audit logs)
  - Throw NotFoundException if not found
  - Return formatted tenant detail object

  **`create(data: CreateTenantDto)`**
  - Check slug uniqueness
  - Validate adminEmail:
    - If user exists, verify they're not already admin of another tenant
    - If not, create new user with ADMIN role
  - Create tenant in transaction:
    1. Create Tenant record
    2. Create UserTenant relation for admin
    3. Create AuthenticationProvider if new user
  - Log to audit: "tenant.created"
  - Return tenant with admin user

  **`update(id: string, data: UpdateTenantDto)`**
  - Check tenant exists
  - Validate slug uniqueness (if changed)
  - Prevent updates to system tenant (if configured)
  - Update tenant fields
  - Log to audit: "tenant.updated"
  - Return updated tenant

  **`delete(id: string, options: DeleteOptions)`**
  - Check tenant exists and is not system tenant
  - If `softDelete`: set `deletedAt` timestamp
  - If `hardDelete`: cascade delete with options:
    - `deleteUsers`: delete all users
    - `retainUsers`: unlink users from tenant
    - `anonymizeData`: anonymize user data
  - Log to audit with deletion method
  - Return success status

- **Helper Methods:**
  - `generateSlug(name: string)`: generate URL-friendly slug
  - `getTenantStats(id: string)`: get aggregated statistics
  - `validateSlug(slug: string)`: check slug format and uniqueness
  - `isSystemTenant(id: string)`: check if tenant is protected

- **Transaction Management:**
  - Use `$transaction` for operations spanning multiple models
  - Ensure atomic operations
  - Rollback on any error

**Verification:**
- [ ] All methods handle errors gracefully
- [ ] Transactions work correctly
- [ ] Slug validation prevents duplicates
- [ ] Audit logs are created for all operations
- [ ] Stats aggregation works efficiently
- [ ] Delete operations respect retention options
- [ ] Service methods are properly typed

---

### 2.1.3 Tenant Creation with Admin Assignment

**Objective:** Handle tenant creation with automatic admin user assignment.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.service.ts` (extend previous)

**Requirements:**

- **Create Tenant Flow:**
  1. Validate input data (name, slug, adminEmail)
  2. Check if adminEmail already exists:
     - If yes: verify user is not already admin of another tenant
     - If no: prepare to create new user
  3. Generate slug from name if not provided
  4. Start database transaction
  5. Create Tenant record
  6. Handle admin user:
     - Existing user: add UserTenant relation with ADMIN role
     - New user: create User + AuthenticationProvider + UserTenant
  7. Send welcome email to admin (async)
  8. Log to audit with creator ID
  9. Return tenant with admin details

- **Admin Assignment Edge Cases:**
  - User already belongs to tenant: return conflict error
  - User has different role in other tenant: allow (multi-tenant)
  - User is suspended: prevent assignment

- **Email Notification:**
  - Queue email for sending (async)
  - Include: tenant name, login URL, admin credentials
  - If new user: include temporary password
  - Handle email failures gracefully (log error)

- **Default Settings:**
  - Set default plan: "free" (if billing implemented)
  - Set default features based on plan
  - Create default roles for tenant (if using per-tenant roles)

**Verification:**
- [ ] New tenant creates admin user correctly
- [ ] Existing user can be assigned as admin
- [ ] Slug generation works
- [ ] Transaction rolls back on error
- [ ] Email notification is queued
- [ ] Audit log captures creation event
- [ ] Edge cases are handled properly

---

### 2.1.4 Tenant Update Validation

**Objective:** Implement comprehensive validation for tenant updates.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.service.ts` (extend previous)

**Requirements:**

- **Update Validation Rules:**
  - **Name:**
    - Required if provided
    - Min length: 2 characters
    - Max length: 100 characters
    - No special characters (except spaces, hyphens, apostrophes)
  - **Slug:**
    - Required if provided
    - Lowercase only
    - No spaces (use hyphens)
    - Alphanumeric + hyphens only
    - Min length: 3 characters
    - Max length: 50 characters
    - Must be unique across all tenants
    - Cannot be changed for system tenant
  - **Status/Settings:**
    - Validate plan values (if billing enabled)
    - Validate feature flags (must be valid keys)
    - Prevent disabling critical features

- **Business Rules:**
  - Cannot update system tenant (reserved for super admin)
  - Cannot reduce features if tenants are using them
  - Cannot change tenant ID or createdAt timestamp
  - Can only update if tenant is not suspended (unless reactivating)

- **Validation DTO:**
  - Create `UpdateTenantDto` with all optional fields
  - Use Zod for schema validation
  - Add custom refinements for business rules

- **Conflict Detection:**
  - Check for slug conflicts before updating
  - Check for name conflicts (optional)
  - Return 409 with existing tenant ID

- **Partial Updates:**
  - Only update fields that are provided
  - Don't override with null/undefined
  - Use TypeScript's Partial type

**Verification:**
- [ ] All validation rules are enforced
- [ ] Slug uniqueness check works
- [ ] System tenant cannot be updated
- [ ] Partial updates work correctly
- [ ] Conflict detection returns proper error
- [ ] Validation errors are user-friendly
- [ ] Business rules are enforced

---

### 2.1.5 Soft Delete with Data Retention

**Objective:** Implement soft deletion with configurable data retention options.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.service.ts` (extend previous)

**Requirements:**

- **Soft Delete Implementation:**
  - Add `deletedAt` field to Tenant model (nullable DateTime)
  - Add `deletedBy` field to track who deleted
  - Modify all queries to exclude soft-deleted tenants by default
  - Add `includeDeleted` parameter for admin queries

- **Data Retention Options:**
  - **Option 1: Immediate Deletion**
    - Hard delete all tenant data
    - Cascade to users, audit logs, etc.
    - Irreversible

  - **Option 2: Soft Delete (Default)**
    - Mark tenant as deleted
    - Prevent new operations
    - Data retained for 30 days
    - Auto-purge after retention period (cron job)

  - **Option 3: Anonymize Data**
    - Anonymize user data (name, email)
    - Remove personal information
    - Keep analytics/usage data

  - **Option 4: Archive**
    - Move data to archive tables
    - Compress for storage
    - Accessible via archive endpoints

- **Cascade Options:**
  - `cascadeUsers`: delete/anonymize all users in tenant
  - `cascadeAuditLogs`: delete or anonymize audit logs
  - `cascadeApiKeys`: revoke all API keys
  - `cascadeSessions`: invalidate all user sessions

- **Restore Functionality:**
  - Allow restoring soft-deleted tenants
  - Restore all related data (if not purged)
  - Reactivate users and sessions

- **Cleanup Job:**
  - Create cron job to permanently delete expired soft-deletes
  - Run daily
  - Log cleanup actions

**Verification:**
- [ ] Soft delete marks tenant as deleted
- [ ] Deleted tenants are excluded from queries
- [ ] Retention options work correctly
- [ ] Restore functionality works
- [ ] Cascade options properly handle related data
- [ ] Cleanup job works as scheduled
- [ ] Audit logs capture deletion events
- [ ] Restore logs capture restoration events

---

## Task 2.2: Backend - Tenant Lifecycle

### 2.2.1 Suspend Tenant (Cascade to Users)

**Objective:** Suspend a tenant and cascade suspension to all associated users.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.service.ts`

**Requirements:**

- **Suspend Flow:**
  1. Validate tenant exists and is not already suspended
  2. Prevent suspending system tenant (if configured)
  3. Start database transaction:
     - Update tenant status: `suspended: true`
     - Update all users in tenant: `status: SUSPENDED`
     - Invalidate all user sessions (refresh tokens)
     - Revoke all API keys for tenant
  4. Log to audit: "tenant.suspended"
  5. Notify users via email (async queue)
  6. Return tenant with suspension details

- **Notification:**
  - Send email to tenant admin: "Your tenant has been suspended"
  - Include reason and contact information
  - Send to all users if configured
  - Batch emails to avoid rate limits

- **Reasons for Suspension:**
  - Allow adding reason (required for audit)
  - Store reason in audit log
  - Options: "payment_overdue", "tos_violation", "abuse", "other"

- **Grace Period:**
  - Allow grace period before suspension (configurable)
  - Send warning emails during grace period
  - Suspension only after grace period expires

- **Effects of Suspension:**
  - Users cannot log in
  - API keys are invalidated
  - No new data can be created
  - Existing data remains (read-only)
  - All active sessions are terminated

**Verification:**
- [ ] Tenant status is updated
- [ ] All users are suspended
- [ ] All sessions are invalidated
- [ ] API keys are revoked
- [ ] Notification emails are queued
- [ ] System tenant cannot be suspended
- [ ] Audit log captures suspension event
- [ ] Grace period works (if configured)

---

### 2.2.2 Restore Tenant

**Objective:** Restore a suspended tenant and reactivate all users.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.service.ts`

**Requirements:**

- **Restore Flow:**
  1. Validate tenant exists and is suspended
  2. Check if restoration is allowed (e.g., within retention period)
  3. Start database transaction:
     - Update tenant status: `suspended: false`
     - Update all users: `status: ACTIVE` (or previous status)
     - DO NOT restore previously revoked sessions (security)
  4. Log to audit: "tenant.restored"
  5. Notify tenant admin: "Your tenant has been restored"
  6. Return tenant with restoration details

- **Restoration Validation:**
  - Check if suspended for valid reason (e.g., payment now current)
  - Allow restoring with or without user reactivation
  - Option to reactivate all users or only select users

- **Post-Restoration Actions:**
  - Re-activate API keys (if configured)
  - Clear suspension reason
  - Reset any suspension counters
  - Allow users to log in again

- **Partial Restoration:**
  - Option to restore tenant but keep specific users suspended
  - Useful for handling individual policy violations
  - Add `excludeUserIds` parameter

**Verification:**
- [ ] Tenant status is updated to active
- [ ] Users are reactivated
- [ ] Sessions are NOT automatically restored
- [ ] Notification email is sent
- [ ] API keys are restored (if configured)
- [ ] Audit log captures restoration event
- [ ] Partial restoration works
- [ ] Validation prevents unauthorized restoration

---

### 2.2.3 Tenant Statistics (Users, Activity)

**Objective:** Provide comprehensive statistics for each tenant.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.service.ts`

**Requirements:**

- **Statistics Aggregation:**
  - User Statistics:
    - Total users
    - Active users (logged in last 30 days)
    - New users (last 7 days)
    - Users by role (ADMIN, MEMBER, GUEST)
    - Users by status (ACTIVE, SUSPENDED, PENDING)
  - Activity Statistics:
    - Total sessions in last 24 hours
    - API requests (last 7 days)
    - API requests by endpoint
    - Error rate (5xx responses)
  - System Statistics:
    - Database size
    - Storage usage (if file uploads)
    - Audit log count (last 30 days)

- **Implementation:**
  - Use Prisma aggregations with `_count`
  - Use raw SQL for complex queries (if needed)
  - Cache statistics (5-minute TTL)
  - Invalidate cache on changes

- **Time Series Data:**
  - User growth over time (daily/monthly)
  - Activity trends (hourly/daily)
  - Usage patterns (peak times)
  - Format for charts: `[{ date: '2024-01-01', value: 10 }]`

- **Performance:**
  - Use database indexes for aggregation queries
  - Limit time range for activity queries
  - Paginate user list for large tenants

**Verification:**
- [ ] All statistics are calculated correctly
- [ ] Cache works and invalidates properly
- [ ] Time series data is formatted correctly
- [ ] Performance is acceptable (< 500ms)
- [ ] No N+1 query issues
- [ ] Statistics update in real-time

---

### 2.2.4 Tenant Search and Filtering

**Objective:** Implement advanced search and filtering for tenant lists.

**File Location:** `apps/api/src/admin/tenant/tenant-admin.service.ts`

**Requirements:**

- **Search Functionality:**
  - Search by name (partial, case-insensitive)
  - Search by slug (partial, case-insensitive)
  - Search by domain (if configured)
  - Search by admin email (via relation)

- **Filter Options:**
  - Status: `all`, `active`, `suspended`, `deleted`
  - Plan: `free`, `pro`, `enterprise` (if billing)
  - Date range: `createdAt` between dates
  - User count: min/max number of users
  - Domain: with/without custom domain

- **Sorting Options:**
  - Name (asc/desc)
  - Created date (asc/desc)
  - User count (asc/desc)
  - Last activity (asc/desc)

- **Implementation:**
  - Build dynamic Prisma where clause
  - Use Prisma's `OR` for search across multiple fields
  - Use `AND` for combining filters
  - Use `_count` for user count filtering

- **Advanced Features:**
  - Full-text search for large datasets
  - Autocomplete suggestions for search
  - Saved searches (user preference)
  - Export filtered results to CSV

**Verification:**
- [ ] Search works across all fields
- [ ] Filters combine correctly (AND logic)
- [ ] Sorting works for all sort fields
- [ ] Pagination works with filters
- [ ] Performance is acceptable (< 300ms)
- [ ] Empty states are handled properly
- [ ] Edge cases (special chars, unicode) work

---

## Task 2.3: Frontend - Tenant Pages

### 2.3.1 Tenant List with DataTable

**Objective:** Build a comprehensive tenant list view with data table.

**File Location:** `apps/web/src/app/admin/tenants/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/admin/tenants`
  - Layout: Admin layout with sidebar
  - Page header: "Tenants" with "Create Tenant" button
  - Data table with sortable columns
  - Pagination controls

- **DataTable Columns:**
  - **Name**: Tenant name with link to detail
  - **Slug**: Display slug with copy-to-clipboard
  - **Status**: Badge (Active/Suspended/Deleted) with color coding
  - **Users**: Count of users with link to user list
  - **Plan**: Display plan (Free/Pro/Enterprise) with icon
  - **Created**: Date with relative time
  - **Actions**: Dropdown menu (Edit, Suspend, Delete)

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

### 2.3.2 Create Tenant Form

**Objective:** Build a form for creating new tenants.

**File Location:** `apps/web/src/app/admin/tenants/create/page.tsx` or modal

**Requirements:**

- **Form Fields:**
  - **Name** (required): Text input
    - Validation: min 2 chars, max 100 chars
    - Auto-generate slug from name (with option to override)
  - **Slug** (required): Text input
    - Validation: lowercase, alphanumeric + hyphens
    - Preview URL: `example.com/tenant/slug`
  - **Admin Email** (required): Email input
    - Validation: valid email format
    - Check if user already exists
    - Show warning if user already exists
  - **Admin Name** (optional): Text input
    - Used when creating new admin user
    - Default: "Admin"
  - **Plan**: Dropdown/Select
    - Options: Free, Pro, Enterprise
    - Show plan features
  - **Custom Domain** (optional): Text input
    - Format: `tenant.example.com`
    - Validate domain format

- **Form Behavior:**
  - Client-side validation with Zod
  - Real-time validation feedback
  - Auto-generate slug on name change (debounced)
  - Check slug availability on blur
  - Show password confirmation for new admin

- **Submit Handling:**
  - Use server action: `createTenantAction`
  - Show loading state on submit
  - Disable form during submission
  - On success: redirect to tenant detail
  - On error: display error message (field or general)

- **UX Considerations:**
  - Step-by-step wizard (optional)
  - Preview tenant before creation
  - "Create and add another" option
  - Keyboard shortcuts (Ctrl+Enter to submit)

**Verification:**
- [ ] All form fields render correctly
- [ ] Validation works in real-time
- [ ] Slug auto-generation works
- [ ] Slug availability check works
- [ ] Form submits successfully
- [ ] Error messages are displayed
- [ ] Loading states work
- [ ] Redirect on success
- [ ] Form is accessible (ARIA attributes)

---

### 2.3.3 Tenant Detail View with Stats

**Objective:** Display comprehensive tenant information and statistics.

**File Location:** `apps/web/src/app/admin/tenants/[id]/page.tsx`

**Requirements:**

- **Page Layout:**
  - Route: `/admin/tenants/:id`
  - Header with tenant name and actions
  - Tabs for different views: Overview, Users, Settings

- **Overview Tab:**
  - **Summary Cards:**
    - Total users
    - Active users (last 30 days)
    - Plan and status
    - Created date
  - **User Statistics:**
    - Users by role (pie chart)
    - Users by status (bar chart)
    - User growth (line chart)
  - **Activity Timeline:**
    - Recent audit logs (last 10 entries)
    - Login activity (last 24 hours)
  - **Tenant Settings:**
    - Domain: custom domain if configured
    - Features: enabled feature flags

- **Users Tab:**
  - List of users with pagination
  - Search and filter by role/status
  - Quick actions: suspend/activate, change role

- **Settings Tab:**
  - Update tenant name and slug
  - Change plan
  - Danger zone: suspend/restore/delete

- **Data Fetching:**
  - Fetch tenant data with `getTenantById` API
  - Fetch statistics separately
  - Refresh on interval (30 seconds for stats)

**Verification:**
- [ ] All tabs render correctly
- [ ] Statistics are accurate
- [ ] Charts render with data
- [ ] User list works in Users tab
- [ ] Settings update works
- [ ] Activity timeline shows recent events
- [ ] Loading and error states work
- [ ] Responsive design works

---

### 2.3.4 Edit Tenant Form

**Objective:** Create an edit form for updating tenant information.

**File Location:** `apps/web/src/app/admin/tenants/[id]/edit/page.tsx`

**Requirements:**

- **Form Fields:**
  - **Name** (required): Text input with validation
  - **Slug** (required): Text input with validation
    - Show warning: "Changing slug will break existing URLs"
    - Confirm action if changing
  - **Custom Domain** (optional): Text input
  - **Plan** (optional): Dropdown with plan options
  - **Features** (optional): Toggle switches for feature flags
    - Show current enabled features

- **Edit Behavior:**
  - Pre-populate form with existing data
  - Show "Save" and "Cancel" buttons
  - Cancel redirects to detail view
  - Dirty state detection (warn on navigation)

- **Validation:**
  - Same as create form
  - Check for slug conflicts
  - Custom domain validation
  - Prevent changing system tenant settings

- **Success/Error Handling:**
  - Show success toast: "Tenant updated"
  - Redirect to detail view on success
  - Show error toast with message
  - Preserve form data on error

**Verification:**
- [ ] Form is pre-populated with data
- [ ] Validation works for all fields
- [ ] Save updates the tenant
- [ ] Dirty state works
- [ ] Cancel redirects correctly
- [ ] Success/error toasts appear
- [ ] System tenant restrictions work

---

### 2.3.5 Tenant Actions (Suspend/Restore/Delete)

**Objective:** Implement action buttons with confirmation dialogs.

**File Location:** `apps/web/src/components/admin/tenant-actions.tsx`

**Requirements:**

- **Action Components:**
  - Create dropdown menu with all actions
  - Separate buttons for primary actions

- **Suspend Action:**
  - Open confirmation dialog
  - Show warning: "All users will be suspended"
  - Require reason text input (required)
  - Checkbox: "Send notification to tenant admin"
  - Confirm button: "Suspend Tenant"
  - On success: show toast, update status

- **Restore Action:**
  - Open confirmation dialog
  - Show info: "Tenant will be restored"
  - Checkbox: "Restore all users"
  - Checkbox: "Send notification to tenant admin"
  - Confirm button: "Restore Tenant"
  - On success: show toast, update status

- **Delete Action:**
  - Open confirmation dialog
  - Show danger warning: "This action is irreversible"
  - Require typing tenant name to confirm
  - Options: Soft delete vs Hard delete
  - Data retention options (if applicable)
  - Confirm button: "Delete Tenant" (red)
  - On success: redirect to tenant list

- **Error Handling:**
  - Show error messages
  - Handle network errors
  - Handle authorization errors

**Verification:**
- [ ] All actions have confirmation dialogs
- [ ] Suspend works with reason
- [ ] Restore works with options
- [ ] Delete requires confirmation
- [ ] Error handling works
- [ ] Toast notifications appear
- [ ] Status updates in real-time
- [ ] Audit logs capture actions

---

## Task 2.4: Frontend - Advanced UI

### 2.4.1 Search and Filter Bar

**Objective:** Build an advanced search and filter interface for tenant list.

**File Location:** `apps/web/src/components/admin/tenant-filters.tsx`

**Requirements:**

- **Search Bar:**
  - Search input with debounce (300ms)
  - Search placeholder: "Search by name, slug, or email"
  - Clear button
  - Search icon

- **Filter Panel:**
  - **Status filter**: Dropdown with: All, Active, Suspended, Deleted
  - **Plan filter**: Dropdown with: All, Free, Pro, Enterprise
  - **Date range**: Date picker (from/to)
  - **User count**: Min/Max range slider or number inputs
  - **Sort options**: Dropdown with sort fields

- **Advanced Filters:**
  - Expandable "Advanced" section
  - Additional filters: Created by, Domain, Feature flags
  - Reset all filters button

- **Filter Persistence:**
  - Store filters in URL query parameters
  - Allow sharing filtered views
  - Restore filters on page reload

- **Quick Filters:**
  - Quick filter chips: "Suspended", "Free plan", "New tenants"
  - Click chip to apply filter

**Verification:**
- [ ] Search works with debounce
- [ ] All filters work correctly
- [ ] Filters are applied to API request
- [ ] URL query parameters update
- [ ] Filters persist on reload
- [ ] Clear all works
- [ ] Quick filter chips work
- [ ] Advanced filters toggle

---

### 2.4.2 Bulk Actions (Suspend/Delete)

**Objective:** Implement bulk actions for multiple tenants.

**File Location:** `apps/web/src/components/admin/bulk-tenant-actions.tsx`

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
    - Show affected tenant count
    - Process in batches (to avoid timeouts)
  - **Bulk Restore**:
    - Show confirmation dialog
    - Show affected tenant count
    - Process in batches
  - **Bulk Delete**:
    - Show danger confirmation
    - Require type "DELETE" to confirm
    - Show affected tenant count
    - Process with retention options

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
- [ ] Bulk restore works
- [ ] Bulk delete works
- [ ] Progress bar shows
- [ ] Error handling works
- [ ] Cancellation works

---

### 2.4.3 Tenant Activity Timeline

**Objective:** Display tenant activity history in a timeline format.

**File Location:** `apps/web/src/components/admin/tenant-activity-timeline.tsx`

**Requirements:**

- **Timeline Display:**
  - Chronological view (most recent first)
  - Date separators (Today, Yesterday, This Week, etc.)
  - Each event shows:
    - Icon based on action type
    - Action description
    - User who performed action
    - Timestamp (relative + absolute)
    - IP address (optional)

- **Event Types:**
  - Tenant created
  - Tenant updated
  - User added/removed
  - User role changed
  - Tenant suspended/restored
  - Payment events (if billing)
  - Feature flag changes
  - Settings changes

- **Filtering:**
  - Filter by event type
  - Filter by user
  - Filter by date range

- **Infinite Scroll:**
  - Load more events on scroll
  - Show "Load more" button
  - Loading skeleton

- **Search:**
  - Search within activity description
  - Search by user email

**Verification:**
- [ ] Timeline renders correctly
- [ ] Events show proper icons
- [ ] Date separators work
- [ ] Filtering works
- [ ] Infinite scroll works
- [ ] Search works
- [ ] Loading states work
- [ ] Empty state shows when no events

---

## Phase 2 Verification Checklist

Before proceeding to Phase 3, verify:

- [ ] All API endpoints work correctly
- [ ] Tenant CRUD operations are functional
- [ ] Tenant suspension/restoration works
- [ ] User cascade suspension works
- [ ] Statistics are accurate
- [ ] Search and filtering work
- [ ] Tenant list page renders with data
- [ ] Create tenant form works
- [ ] Edit tenant form works
- [ ] Tenant detail view works
- [ ] All actions have confirmation dialogs
- [ ] Bulk actions work
- [ ] Activity timeline works
- [ ] All tests pass
- [ ] No ESLint errors
- [ ] Build succeeds

---

## Phase 2 Completion Criteria

- [ ] AdminTenantController with full CRUD endpoints
- [ ] AdminTenantService with business logic
- [ ] Tenant creation with admin assignment
- [ ] Tenant update with validation
- [ ] Soft delete with data retention options
- [ ] Tenant suspension with user cascade
- [ ] Tenant restoration
- [ ] Tenant statistics aggregation
- [ ] Search and filtering
- [ ] Tenant list with DataTable
- [ ] Create tenant form
- [ ] Tenant detail view with stats
- [ ] Edit tenant form
- [ ] Tenant actions (suspend/restore/delete)
- [ ] Search and filter bar
- [ ] Bulk actions
- [ ] Tenant activity timeline
- [ ] Audit logs for all tenant operations

---

## Phase 2 Tips & Best Practices

1. **Data Tables:** Use TanStack Table for flexibility and performance
2. **Form Validation:** Reuse Zod schemas from shared package
3. **API Performance:** Use database indexes on frequently queried fields
4. **Error Handling:** Always provide user-friendly error messages
5. **Real-time Updates:** Use optimistic updates for better UX
6. **Caching:** Cache tenant statistics for 5 minutes
7. **Audit Logs:** Log all tenant management actions
8. **Testing:** Test edge cases (system tenant, conflict detection)
9. **Accessibility:** Ensure all forms and tables are accessible
10. **Responsive:** Make sure UI works on all screen sizes

---

**Ready for Phase 3?** Let me know when Phase 2 is complete!