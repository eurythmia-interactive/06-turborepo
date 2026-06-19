# Phase 4: Role & Permission Management — Complete Instructions

## Overview
This phase implements a dynamic role-based access control system with granular permissions. You'll build backend CRUD for roles, a permission assignment service, a comprehensive permission matrix UI, and integration with user management for role assignment.

---

## Task 4.1: Backend - Role Management

### 4.1.1 AdminRoleController Endpoints

**Objective:** Create REST API endpoints for role management operations.

**File Location:** `apps/api/src/admin/role/role-admin.controller.ts`

**Requirements:**

- **Controller Setup:**
  - Use `@Controller('admin/roles')` decorator
  - Apply `@UseGuards(AdminAuthGuard, AdminPermissionsGuard)` for all endpoints
  - Use `@RequirePermission('role:write')` for write operations
  - Use `@RequirePermission('role:read')` for read operations

- **Endpoint Definitions:**

  **List Roles:**
  - `GET /api/v1/admin/roles`
  - Query parameters:
    - `page` (default: 1)
    - `limit` (default: 20, max: 100)
    - `search` (search by name or description)
    - `includeSystem` (boolean, default: false)
  - Response: Paginated list with role data and metadata
  - Include user count for each role

  **Get Role:**
  - `GET /api/v1/admin/roles/:id`
  - Include related data:
    - Permissions (full list)
    - User count
    - System role indicator
    - Created by
  - Return 404 if role not found

  **Get Role by Name:**
  - `GET /api/v1/admin/roles/name/:name`
  - Useful for checking role existence
  - Return role data if found

  **Create Role:**
  - `POST /api/v1/admin/roles`
  - Body: `CreateRoleDto` (name, description, permissions, isSystem)
  - Validate name uniqueness
  - Validate permissions exist in system
  - Prevent creating system roles (only via seed)
  - Return created role with permissions

  **Update Role:**
  - `PATCH /api/v1/admin/roles/:id`
  - Body: `UpdateRoleDto` (partial update)
  - Validate name uniqueness (if changed)
  - Prevent updating system roles (except description)
  - Validate permissions exist
  - Return updated role

  **Delete Role:**
  - `DELETE /api/v1/admin/roles/:id`
  - Prevent deleting system roles
  - Check if role is in use (users assigned)
  - Option to reassign users or prevent deletion
  - Return success message

- **Request/Response Validation:**
  - Use Zod schemas from `@repo/shared` for DTO validation
  - Apply `UseSchema` decorator for validation
  - Use `UseResponseSchema` for consistent responses

- **Error Handling:**
  - 400: Validation errors (invalid data)
  - 404: Role not found
  - 409: Name conflict (already exists)
  - 403: Insufficient permissions (e.g., deleting system role)
  - 422: Role in use (cannot delete)

**Verification:**
- [ ] All endpoints are properly decorated
- [ ] Guards apply to all endpoints
- [ ] Request validation works with Zod schemas
- [ ] Pagination works correctly
- [ ] Search and filtering work
- [ ] Proper error responses are returned
- [ ] System roles are protected

---

### 4.1.2 Role CRUD Operations

**Objective:** Implement core business logic for role operations.

**File Location:** `apps/api/src/admin/role/role-admin.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with Prisma client
  - Inject `AuditLogService` for logging
  - Inject `PermissionService` for validation
  - Inject `UserAdminService` for user updates

- **Core Methods:**

  **`findAll(params: RoleListParams)`**
  - Build dynamic where clause based on filters
  - Include user count via `_count` relation
  - Apply search on name and description
  - Sort by specified field
  - Return paginated result

  **`findById(id: string)`**
  - Fetch role with permissions and user count
  - Include `createdBy` user details
  - Throw NotFoundException if not found
  - Return formatted role detail

  **`findByName(name: string)`**
  - Fetch role by name (case-insensitive)
  - Used for validation and lookups

  **`create(data: CreateRoleDto)`**
  - Check name uniqueness
  - Validate permissions exist (all provided permissions)
  - Check if name is reserved (SUPER_ADMIN, ADMIN, etc.)
  - Create role with permissions
  - Log to audit: "role.created"
  - Return created role

  **`update(id: string, data: UpdateRoleDto)`**
  - Check role exists
  - Check if role is system (prevent certain updates)
  - Validate name uniqueness (if changed)
  - Validate permissions exist (if updated)
  - Update role fields and permissions
  - Log to audit: "role.updated"
  - Return updated role

  **`delete(id: string, options: DeleteOptions)`**
  - Check role exists
  - Prevent deleting system roles
  - Check if role is in use:
    - Count users with this role
    - If users exist and `force` is false, throw error
    - If `reassignTo` is provided, reassign users
  - Delete role and permissions
  - Log to audit: "role.deleted"
  - Return success status

- **Helper Methods:**
  - `validatePermissionList(permissions: string[])`: check all exist
  - `isSystemRole(name: string)`: check if role is system-defined
  - `getRoleUsers(id: string)`: get users with this role
  - `reassignUsers(roleId: string, newRoleId: string)`: reassign all users

- **Transaction Management:**
  - Use `$transaction` for operations spanning multiple models
  - Ensure atomic operations
  - Rollback on any error

**Verification:**
- [ ] All methods handle errors gracefully
- [ ] Transactions work correctly
- [ ] Name uniqueness is enforced
- [ ] System roles are protected
- [ ] User reassignment works on deletion
- [ ] Audit logs are created for all operations
- [ ] Permission validation works

---

### 4.1.3 Permission Assignment Service

**Objective:** Handle permission assignment to roles.

**File Location:** `apps/api/src/admin/role/permission-assignment.service.ts`

**Requirements:**

- **Permission Data Structure:**
  ```typescript
  interface Permission {
    id: string
    resource: string  // 'tenant', 'user', 'role', 'admin', 'system'
    action: string    // 'read', 'write', 'delete', 'suspend', etc.
    description: string
    category: string  // 'management', 'security', 'system'
  }
  ```

- **Core Methods:**

  **`assignPermissions(roleId: string, permissionIds: string[])`**
  - Validate role exists
  - Validate all permissions exist
  - Remove existing permissions (replace)
  - Add new permissions
  - Log to audit: "role.permissions_assigned"
  - Invalidate permission cache
  - Return role with updated permissions

  **`addPermission(roleId: string, permissionId: string)`**
  - Check if permission already assigned
  - Add permission to role
  - Log to audit: "role.permission_added"
  - Invalidate cache

  **`removePermission(roleId: string, permissionId: string)`**
  - Check if permission is assigned
  - Remove permission from role
  - Log to audit: "role.permission_removed"
  - Invalidate cache

  **`getAvailablePermissions()`**
  - Return all permissions defined in system
  - Grouped by category
  - Include assigned status for role

  **`getAssignedPermissions(roleId: string)`**
  - Return all permissions assigned to role
  - Include permission details

- **Permission Groups:**
  - **Tenant Management**: tenant:read, tenant:write, tenant:delete, tenant:suspend
  - **User Management**: user:read, user:write, user:delete, user:suspend, user:reset-password, user:impersonate
  - **Role Management**: role:read, role:write, role:delete
  - **Admin Management**: admin:access, admin:settings, admin:feature-flags, admin:audit, admin:api-keys
  - **System Management**: system:maintenance, system:backup, system:config

**Verification:**
- [ ] Permissions can be assigned to roles
- [ ] Multiple permissions can be assigned
- [ ] Permission validation works
- [ ] Cache invalidates on change
- [ ] Audit logs capture all changes
- [ ] Available permissions are listed correctly

---

### 4.1.4 Role Validation and Constraints

**Objective:** Implement validation rules and constraints for roles.

**File Location:** `apps/api/src/admin/role/role-validator.service.ts`

**Requirements:**

- **Role Validation Rules:**

  **Name Validation:**
  - Required: true
  - Min length: 2 characters
  - Max length: 50 characters
  - Pattern: Alphanumeric, spaces, hyphens, underscores only
  - Must be unique (case-insensitive)
  - Reserved names: ["SUPER_ADMIN", "ADMIN", "MEMBER", "GUEST"]

  **Description Validation:**
  - Optional
  - Max length: 200 characters

  **Permissions Validation:**
  - Must be valid permission strings
  - Minimum: 1 permission
  - Maximum: all permissions (no limit)
  - Must be from defined permission list
  - Cannot assign conflicting permissions (e.g., read-only and write)

  **System Role Constraints:**
  - Cannot create new system roles
  - Cannot delete system roles
  - Cannot rename system roles
  - Can only update description
  - Cannot change permissions (except ADMIN)

- **Business Rules:**
  - SUPER_ADMIN must have ALL permissions
  - ADMIN must have at least user:read, tenant:read
  - MEMBER must have at least user:read
  - GUEST cannot have write permissions
  - Role cannot be deleted if users are assigned (without force flag)

- **Validation Methods:**
  - `validateRoleName(name: string)`: check format and uniqueness
  - `validatePermissions(permissions: string[])`: check all exist
  - `validateSystemRole(id: string)`: check if role is system
  - `validateRoleInUse(id: string)`: check if users assigned
  - `validateRoleAssignment(userId: string, roleId: string)`: check if valid

**Verification:**
- [ ] All validation rules are enforced
- [ ] Reserved names are protected
- [ ] System roles cannot be modified
- [ ] Permission validation works
- [ ] Role in use validation works
- [ ] Business rules are enforced

---

## Task 4.2: Backend - Permission System

### 4.2.1 Permission Resolution Service

**Objective:** Implement service to resolve effective permissions for users.

**File Location:** `apps/api/src/auth/permission/permission-resolution.service.ts`

**Requirements:**

- **Resolution Logic:**
  1. Get user's global role (User.role)
  2. Get user's tenant-specific role (UserTenant.role)
  3. Resolve permissions for both roles
  4. Combine permissions (union of both)
  5. Return effective permission list

- **Resolution Methods:**

  **`resolveUserPermissions(userId: string, tenantId?: string)`**
  - If tenantId provided: resolve for specific tenant
  - If no tenantId: resolve global permissions only
  - Return array of permission strings

  **`hasPermission(userId: string, permission: string, tenantId?: string)`**
  - Check if user has specific permission
  - Use cached resolution for performance
  - Return boolean

  **`hasAllPermissions(userId: string, permissions: string[], tenantId?: string)`**
  - Check if user has ALL specified permissions
  - Return boolean

  **`hasAnyPermission(userId: string, permissions: string[], tenantId?: string)`**
  - Check if user has ANY specified permission
  - Return boolean

- **Caching Strategy:**
  - Cache resolved permissions (TTL: 5 minutes)
  - Invalidate cache on:
    - Role assignment change
    - Role permission change
    - User tenant assignment change
    - User role change

- **Performance Optimization:**
  - Batch resolve for multiple users
  - Use Redis for distributed caching
  - Pre-warm cache for frequently accessed users

**Verification:**
- [ ] Permission resolution works correctly
- [ ] Tenant-specific permissions work
- [ ] Caching works
- [ ] Cache invalidates on changes
- [ ] Performance is acceptable (< 50ms)
- [ ] Batch resolution works

---

### 4.2.2 Dynamic Guard with Permissions

**Objective:** Create a dynamic guard that checks permissions.

**File Location:** `apps/api/src/auth/guards/permission.guard.ts`

**Requirements:**

- **Guard Implementation:**

  **`PermissionGuard` (Enhanced)**
  - Extend existing `AdminPermissionsGuard`
  - Read `@RequirePermission()` metadata from route
  - Resolve user permissions
  - Check if user has required permissions
  - Support AND/OR logic

- **Permission Check Logic:**
  ```typescript
  // AND logic (default) - user must have ALL permissions
  @RequirePermission('user:read', 'user:write')
  
  // OR logic - user must have ANY permission
  @RequireAnyPermission('tenant:write', 'user:write')
  
  // Nested logic (complex)
  @RequirePermission('user:read')
  @RequireAnyPermission('tenant:write', 'user:write')
  ```

- **Dynamic Resolution:**
  - Resolve tenant context from request
  - Resolve user context from JWT
  - Apply tenant-specific permissions

- **Error Response:**
  - 403 with missing permission details
  ```json
  {
    "statusCode": 403,
    "message": "Insufficient permissions",
    "missing": ["user:write"],
    "required": ["user:read", "user:write"]
  }
  ```

**Verification:**
- [ ] Guard checks permissions correctly
- [ ] AND logic works
- [ ] OR logic works
- [ ] Nested logic works
- [ ] Tenant context is resolved
- [ ] Error responses are detailed

---

### 4.2.3 Role-Permission Caching

**Objective:** Implement caching for role-permission mappings.

**File Location:** `apps/api/src/auth/permission/permission-cache.service.ts`

**Requirements:**

- **Cache Implementation:**
  - Use Redis for production (or in-memory for development)
  - Cache keys:
    - `role:permissions:{roleId}` → permission list
    - `user:permissions:{userId}:{tenantId}` → resolved permissions
    - `permission:all` → all available permissions

- **Cache Invalidation:**
  - On role permission change: invalidate role cache
  - On user role change: invalidate user cache
  - On tenant assignment: invalidate user cache
  - On permission creation/deletion: invalidate all cache

- **Cache Methods:**

  **`getRolePermissions(roleId: string)`**
  - Check cache first
  - If miss, fetch from DB
  - Store in cache (TTL: 1 hour)
  - Return permissions

  **`getUserPermissions(userId: string, tenantId?: string)`**
  - Check cache first
  - If miss, resolve from DB
  - Store in cache (TTL: 5 minutes)
  - Return permissions

  **`invalidateRoleCache(roleId: string)`**
  - Delete role cache
  - Invalidate related user caches

  **`invalidateUserCache(userId: string)`**
  - Delete user cache

  **`invalidateAllCache()`**
  - Clear all permission caches

- **Cache Strategy:**
  - Use write-through: update cache on DB changes
  - Use TTL for automatic expiration
  - Use versioning for cache busting

**Verification:**
- [ ] Caching works
- [ ] Cache invalidates on changes
- [ ] Performance improvement is measurable
- [ ] Redis integration works (if used)
- [ ] Cache TTL works correctly

---

### 4.2.4 Permission Inheritance

**Objective:** Implement permission inheritance for roles.

**File Location:** `apps/api/src/admin/role/permission-inheritance.service.ts`

**Requirements:**

- **Inheritance Model:**
  - Roles can inherit from other roles
  - Inherited permissions are additive
  - Infinite inheritance loops are prevented
  - System roles cannot inherit (fixed)

- **Database Schema:**
  - Add `parentRoleId` to Role model
  - Add `inheritsFrom` field (optional)
  - Prevent circular inheritance

- **Implementation Methods:**

  **`getEffectivePermissions(roleId: string)`**
  - Recursively fetch permissions from role and ancestors
  - Use cache for performance
  - Return merged permission list

  **`getInheritanceChain(roleId: string)`**
  - Return ordered list of inherited roles
  - Include depth level
  - Detect circular inheritance

  **`validateInheritance(roleId: string, parentId: string)`**
  - Check if parent exists
  - Check for circular inheritance
  - Check if parent is system role

  **`setInheritance(roleId: string, parentId: string | null)`**
  - Validate inheritance
  - Update role
  - Invalidate cache
  - Log to audit

- **Inheritance Rules:**
  - Super Admin cannot inherit (has all permissions)
  - System roles cannot inherit
  - Cannot inherit from child (no circular)
  - Inheritance depth max: 5 levels
  - Inherited permissions are automatically included

**Verification:**
- [ ] Inheritance works correctly
- [ ] Permissions are inherited
- [ ] Circular inheritance is prevented
- [ ] Cache works with inheritance
- [ ] Audit logs capture inheritance changes

---

## Task 4.3: Frontend - Role Pages

### 4.3.1 Role List

**Objective:** Build a comprehensive role list view.

**File Location:** `apps/web/src/app/admin/roles/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/admin/roles`
  - Page header: "Roles" with "Create Role" button
  - Data table with roles
  - Show role cards or table

- **List Display:**
  - **Role Name**: With color-coded badge
  - **Description**: Role purpose
  - **Permissions**: Count of permissions
  - **Users**: Count of users with this role
  - **System Role**: Badge indicator
  - **Created**: Date with relative time
  - **Actions**: Edit, Delete, Manage Permissions

- **Role Cards vs Table:**
  - Use cards for better visual representation
  - Show permission count with icon
  - Show user count with icon
  - Color coding for role types

- **Search and Filter:**
  - Search by name or description
  - Filter: System roles vs custom roles
  - Sort by name, user count, created date

- **State Management:**
  - Use TanStack Table or custom card grid
  - Manage pagination state
  - Cache responses

**Verification:**
- [ ] Role list renders correctly
- [ ] System roles are indicated
- [ ] User counts are accurate
- [ ] Permission counts are accurate
- [ ] Search works
- [ ] Filter works
- [ ] Actions dropdown works

---

### 4.3.2 Create Role Form

**Objective:** Build a form for creating new roles.

**File Location:** `apps/web/src/app/admin/roles/create/page.tsx`

**Requirements:**

- **Form Fields:**
  - **Name** (required): Text input
    - Validation: min 2 chars, max 50 chars
    - Pattern: alphanumeric, spaces, hyphens, underscores
    - Check availability on blur
  - **Description** (optional): Text area
    - Max length: 200 chars
    - Help text: "Brief description of role's purpose"
  - **Permissions**: Permission selection
    - Grouped by category
    - Checkbox list with select all/deselect all
    - Show count of selected permissions
    - Show permission description on hover
  - **Inherits From** (optional): Role selection dropdown
    - List all existing roles (except current)
    - Show inheritance chain preview

- **Permission Selection UI:**
  - Accordion or tabs for categories
  - "Select All" for each category
  - Visual indication of selected permissions
  - Search within permissions
  - Summary of selected permissions

- **Form Behavior:**
  - Client-side validation with Zod
  - Real-time validation feedback
  - Name availability check on blur
  - Preview permission count
  - Show permission descriptions on hover

- **Submit Handling:**
  - Use server action: `createRoleAction`
  - Show loading state on submit
  - On success: redirect to role list
  - On error: display error message

**Verification:**
- [ ] All form fields render correctly
- [ ] Validation works in real-time
- [ ] Name availability check works
- [ ] Permission selection works
- [ ] Category grouping works
- [ ] Form submits successfully
- [ ] Error messages are displayed
- [ ] Loading states work

---

### 4.3.3 Edit Role with Permission Matrix

**Objective:** Create an edit form with permission matrix for roles.

**File Location:** `apps/web/src/app/admin/roles/[id]/edit/page.tsx`

**Requirements:**

- **Form Fields:**
  - **Name** (conditional): Only if not system role
  - **Description**: Text area
  - **Permissions**: Full permission matrix
  - **Inherits From** (optional): Role selection

- **Permission Matrix UI:**
  - **Matrix Layout:**
    - Resources as rows
    - Actions as columns
    - Checkbox at each intersection
    - Permissions grouped by category

  - **Matrix Features:**
    - Toggle all permissions for a resource
    - Toggle all permissions for an action
    - Show permission count
    - Highlight changed permissions
    - Visual distinction between inherited and direct permissions

  - **Permission Categories:**
    ```
    Tenant Management | Read | Write | Delete | Suspend
    User Management   | Read | Write | Delete | Suspend | Reset Password | Impersonate
    Role Management   | Read | Write | Delete
    Admin Management  | Access | Settings | Feature Flags | Audit | API Keys
    System Management | Maintenance | Backup | Config
    ```

- **Change Tracking:**
  - Show "Changed" indicator on modified permissions
  - Show previous vs new permission state
  - Save button only when changes made
  - Confirm before discarding changes

- **Permission Descriptions:**
  - Hover to show description
  - Tooltip with explanation
  - Example usage

- **Submit Handling:**
  - Use server action: `updateRoleAction`
  - Show loading state on submit
  - On success: redirect to role detail
  - On error: display error message

**Verification:**
- [ ] Permission matrix renders correctly
- [ ] All permissions are displayed
- [ ] Category grouping works
- [ ] Toggle all works
- [ ] Change tracking works
- [ ] Form submits successfully
- [ ] System roles are protected

---

### 4.3.4 Delete Role with Validation

**Objective:** Implement role deletion with validation.

**File Location:** `apps/web/src/components/admin/role-delete-dialog.tsx`

**Requirements:**

- **Delete Dialog:**
  - Show role name and description
  - Show user count (users with this role)
  - Show warning if role is in use
  - Show warning for system roles (prevent deletion)

- **Validation:**
  - **System Role**: Disable delete button, show warning
  - **Role in Use**: Show reassign options
    - "Reassign users to another role" (dropdown)
    - "Force delete" (will unassign users)
  - **Delete Confirmation**:
    - Require typing role name to confirm
    - Show danger warning

- **Reassignment Options:**
  - If users are assigned:
    - Select replacement role (dropdown)
    - Show number of users to reassign
    - "Reassign and Delete" button
    - Process in background

- **Success/Error:**
  - Show success toast: "Role deleted"
  - Redirect to role list
  - Show error toast with message
  - Handle network errors

**Verification:**
- [ ] Delete dialog opens correctly
- [ ] System roles cannot be deleted
- [ ] Role in use shows reassign options
- [ ] Reassignment works
- [ ] Delete confirmation works
- [ ] Success/error toasts appear

---

## Task 4.4: Frontend - Permission UI

### 4.4.1 Permission Matrix Component

**Objective:** Create a reusable permission matrix component.

**File Location:** `apps/web/src/components/admin/permission-matrix.tsx`

**Requirements:**

- **Component Props:**
  ```typescript
  interface PermissionMatrixProps {
    permissions: Permission[]
    selectedPermissions: string[]
    onChange: (permissions: string[]) => void
    readOnly?: boolean
    showDescriptions?: boolean
    className?: string
  }
  ```

- **Matrix Structure:**
  - **Headers**: Actions (Read, Write, Delete, etc.)
  - **Rows**: Resources (Tenants, Users, Roles, etc.)
  - **Cells**: Checkboxes with permission keys

- **Features:**
  - **Select All**: Toggle all permissions
  - **Select All for Resource**: Toggle all permissions in a row
  - **Select All for Action**: Toggle all permissions in a column
  - **Search**: Filter permissions by keyword
  - **Grouping**: Categories with expandable sections
  - **Read-Only**: Display mode without interaction
  - **Responsive**: Works on all screen sizes

- **Visual Design:**
  - Color-coded permission levels (Read=Blue, Write=Green, Delete=Red)
  - Hover effects on cells
  - Tooltips with descriptions
  - Count badge showing selected permissions
  - Disabled cells for invalid combinations

- **Performance:**
  - Memoize cells for large matrices
  - Use virtualization for many permissions
  - Lazy load descriptions

**Verification:**
- [ ] Matrix renders correctly
- [ ] Select all works
- [ ] Resource/action select works
- [ ] Search works
- [ ] Read-only mode works
- [ ] Responsive design works
- [ ] Tooltips work

---

### 4.4.2 Role Assignment UI in User Management

**Objective:** Integrate role assignment into user management.

**File Location:** `apps/web/src/components/admin/role-assignment.tsx`

**Requirements:**

- **Integration Points:**
  - **User Detail Page**: Show role assignment section
  - **User Edit Page**: Role selection dropdown
  - **User List**: Inline role editing
  - **Bulk Operations**: Bulk role assignment

- **Role Assignment Component:**
  ```typescript
  interface RoleAssignmentProps {
    userId: string
    tenantId?: string
    currentRole: string
    availableRoles: Role[]
    onAssign: (roleId: string) => void
    readOnly?: boolean
  }
  ```

- **Features:**
  - Dropdown with all available roles
  - Role descriptions on hover
  - Quick role change with confirmation
  - Show permission count for each role
  - Color-coded role badges
  - Search in role list

- **Bulk Role Assignment:**
  - Select multiple users
  - Choose target role
  - Apply to all selected
  - Show affected count
  - Process with progress

- **Validation:**
  - Prevent assigning SUPER_ADMIN to non-system users
  - Prevent demoting last admin in tenant
  - Show warning if role change affects permissions

**Verification:**
- [ ] Role assignment works
- [ ] Role descriptions show
- [ ] Bulk assignment works
- [ ] Validation works
- [ ] Visual feedback works
- [ ] Audit logs capture changes

---

### 4.4.3 Permission Visualization

**Objective:** Visualize user permissions in an understandable format.

**File Location:** `apps/web/src/components/admin/permission-visualization.tsx`

**Requirements:**

- **Visualization Components:**
  - **Permission Heat Map**: Grid showing permissions by category
  - **Permission Tree**: Hierarchical view of permissions
  - **Permission Badges**: Compact permission indicators
  - **Permission Search**: Find specific permissions

- **Heat Map View:**
  - Resources as rows
  - Actions as columns
  - Color coding: ✅ Has, ❌ Doesn't have, ⚠️ Inherited
  - Count summary: "X of Y permissions"
  - Expandable categories

- **Tree View:**
  ```
  ▼ Tenant Management (4/4)
    ✓ Read
    ✓ Write
    ✓ Delete
    ✓ Suspend
  ▼ User Management (3/6)
    ✓ Read
    ✓ Write
    ✗ Delete
    ✗ Suspend
    ✓ Reset Password
    ✗ Impersonate
  ```

- **Permission Summary:**
  - Total permission count
  - By category breakdown
  - Missing permissions
  - Inherited permissions

- **Comparison View:**
  - Compare two users or roles
  - Show differences
  - Highlight what one has that other doesn't

- **Search:**
  - Search for specific permission
  - Highlight matching permissions
  - Filter by category

**Verification:**
- [ ] Heat map renders correctly
- [ ] Tree view works
- [ ] Permission summary is accurate
- [ ] Comparison view works
- [ ] Search works
- [ ] Color coding is intuitive

---

## Phase 4 Verification Checklist

Before proceeding to Phase 5, verify:

- [ ] All API endpoints work correctly
- [ ] Role CRUD operations are functional
- [ ] Permission assignment works
- [ ] Role validation and constraints work
- [ ] Permission resolution works
- [ ] Dynamic guard works with permissions
- [ ] Role-permission caching works
- [ ] Permission inheritance works
- [ ] Role list page renders with data
- [ ] Create role form works
- [ ] Edit role with permission matrix works
- [ ] Delete role with validation works
- [ ] Permission matrix component works
- [ ] Role assignment in user management works
- [ ] Permission visualization works
- [ ] All tests pass
- [ ] No ESLint errors
- [ ] Build succeeds

---

## Phase 4 Completion Criteria

- [ ] AdminRoleController with full CRUD endpoints
- [ ] Role CRUD operations with validation
- [ ] Permission assignment service
- [ ] Role validation and constraints
- [ ] Permission resolution service
- [ ] Dynamic permission guard
- [ ] Role-permission caching
- [ ] Permission inheritance
- [ ] Role list page
- [ ] Create role form
- [ ] Edit role with permission matrix
- [ ] Delete role with validation
- [ ] Permission matrix component
- [ ] Role assignment UI in user management
- [ ] Permission visualization
- [ ] Audit logs for all role operations

---

## Phase 4 Tips & Best Practices

1. **Permission Names:** Use consistent naming: `resource:action` (e.g., `user:write`)
2. **System Roles:** Always protect SUPER_ADMIN and ADMIN roles
3. **Permission Matrix:** Use visual grouping for better UX
4. **Inheritance:** Keep inheritance chains simple (max 3 levels)
5. **Caching:** Invalidate cache on ALL permission changes
6. **Validation:** Validate permissions before assignment
7. **Audit Logs:** Log ALL role and permission changes
8. **Performance:** Use caching for permission resolution
9. **User Experience:** Show permission counts and descriptions
10. **Security:** Never assign permissions to GUEST that expose data

---

**Ready for Phase 5?** Let me know when Phase 4 is complete!