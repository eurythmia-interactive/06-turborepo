# Phase 3 Implementation Plan: User Management

## Confirmed Decisions

1. ✅ Add `role` field to UserTenant for per-tenant roles
2. ✅ Add `deletedAt`, `deletedBy`, `lastLoginAt`, `isSystem` to User model
3. ✅ Update auth service to track `lastLoginAt` on login
4. ✅ Generate temp password for force reset, return in API response
5. ✅ Prevent self-suspend/delete
6. ✅ Protect system user (super admin from seed) with `isSystem` flag
7. ✅ Full tenant management in user detail (add/remove/change role)
8. ✅ Tenant assignment required when creating user
9. ✅ Implement bulk operations (suspend, activate, delete, role assign)
10. ✅ Show last 20 audit logs in user detail

---

## Phase 3A: Backend Implementation

### Task 3A.1: Schema Migration

**File:** `packages/database/prisma/schema.prisma`

**Changes to User model:**

```prisma
model User {
  id          String     @id @default(cuid())
  email       String     @unique
  name        String?
  image       String?
  status      UserStatus @default(PENDING)
  role        Role       @default(MEMBER)
  isSystem    Boolean    @default(false)  // NEW: protect system users
  lastLoginAt DateTime?                   // NEW: track last login
  deletedAt   DateTime?                   // NEW: soft delete
  deletedBy   String?                     // NEW: who deleted
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  // ... relations unchanged
}
```

**Changes to UserTenant model:**

```prisma
model UserTenant {
  userId    String
  tenantId  String
  role      Role     @default(MEMBER)  // NEW: per-tenant role
  createdAt DateTime @default(now())
  // ... relations unchanged
}
```

**New PasswordResetToken model:**

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}
```

**Add to User relations:**

```prisma
passwordResetTokens PasswordResetToken[]
```

**Seed update:**

```typescript
// Mark super admin as system user
const superAdmin = await prisma.user.upsert({
  where: { email: 'superadmin@example.com' },
  update: {},
  create: {
    email: 'superadmin@example.com',
    name: 'Super Admin',
    role: Role.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    isSystem: true, // NEW
  },
});
```

**Migration:**

- Run `pnpm --filter @repo/database db:migrate --name add_user_lifecycle_and_tenant_roles`
- Regenerate Prisma client

**Verification:**

- [ ] Migration applies successfully
- [ ] Prisma client regenerated
- [ ] All new fields accessible
- [ ] Existing data has default values

---

### Task 3A.2: Update Shared User Schemas

**File:** `packages/shared/src/admin/user.schema.ts`

**Update `userResponseSchema`:**

```typescript
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
  isSystem: z.boolean(),
  lastLoginAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
  deletedBy: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tenants: z
    .array(
      z.object({
        tenantId: z.string(),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
        createdAt: z.date(),
      }),
    )
    .optional(),
});
```

**Update `userListQuerySchema`:**

```typescript
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  tenantId: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

**Add new schemas:**

```typescript
export const suspendUserSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).optional(),
});

export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string()).min(1),
  reason: z.string().optional(),
});

export const bulkRoleAssignSchema = z.object({
  userIds: z.array(z.string()).min(1),
  tenantId: z.string(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
});

export const addToTenantSchema = z.object({
  tenantId: z.string(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).default('MEMBER'),
});

export const updateTenantRoleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']),
});
```

**Update `createUserSchema`:**

```typescript
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/, 'At least one lowercase letter')
    .regex(/[A-Z]/, 'At least one uppercase letter')
    .regex(/[0-9]/, 'At least one digit')
    .regex(/[^a-zA-Z0-9]/, 'At least one special character'),
  tenantId: z.string().min(1, 'Tenant is required'), // NOW REQUIRED
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).default('MEMBER'),
});
```

**Export new types:**

- `SuspendUserInput`, `ResetPasswordInput`, `BulkUserActionInput`
- `BulkRoleAssignInput`, `AddToTenantInput`, `UpdateTenantRoleInput`

**Verification:**

- [ ] All schemas compile
- [ ] Types exported from `@repo/shared`
- [ ] Validation works correctly

---

### Task 3A.3: UserAdminService - Core CRUD

**File:** `apps/api/src/admin/user/user-admin.service.ts`

**Setup:**

```typescript
@Injectable()
export class UserAdminService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly auditService: AuditService,
  ) {}
}
```

**Methods:**

**`findAll(query: UserListQuery)`**

- Build dynamic where clause
- Search: `OR` on name, email (case-insensitive)
- Filter: tenantId (via UserTenant relation), role, status
- Exclude soft-deleted by default (`deletedAt: null`)
- Sort by specified field
- Return paginated result with total count
- Include tenant relations with roles

**`findById(id: string)`**

- Fetch user with:
  - Tenants (with roles via UserTenant)
  - Recent audit logs (last 20)
- Throw NotFoundException if not found
- Return formatted user detail object

**`create(data: CreateUserInput, adminUserId: string, ip?, userAgent?)`**

- Check email uniqueness
- Validate tenant exists
- Hash password with argon2
- Transaction:
  1. Create User record
  2. Create AuthenticationProvider (LOCAL)
  3. Create UserTenant relation with role
- Log to audit: "user.created"
- Return user with tenant assignment

**`update(id: string, data: UpdateUserInput, adminUserId: string, ip?, userAgent?)`**

- Check user exists
- Prevent updating system user (isSystem: true)
- Validate email uniqueness (if changed)
- Partial update
- Log to audit: "user.updated"
- Return updated user

**`softDelete(id: string, deletedBy: string, ip?, userAgent?)`**

- Check user exists
- Prevent deleting self (id === deletedBy)
- Prevent deleting system user
- Set `deletedAt` + `deletedBy`
- Log to audit: "user.deleted"
- Return success

**Verification:**

- [ ] All methods handle errors gracefully
- [ ] Transactions work correctly
- [ ] Email validation prevents duplicates
- [ ] Audit logs created for all operations
- [ ] Cannot delete self
- [ ] Cannot modify system user

---

### Task 3A.4: UserAdminService - Lifecycle Operations

**File:** `apps/api/src/admin/user/user-admin.service.ts` (extend)

**Methods:**

**`suspend(id: string, reason: string, adminUserId: string, ip?, userAgent?)`**

- Check user exists
- Prevent suspending self
- Prevent suspending system user
- Check not already suspended
- Transaction:
  1. Update user status: SUSPENDED
  2. Revoke all refresh tokens
  3. Revoke all API keys
- Log to audit: "user.suspended" with reason
- Return success

**`activate(id: string, adminUserId: string, ip?, userAgent?)`**

- Check user exists
- Check is suspended
- Update user status: ACTIVE
- Log to audit: "user.activated"
- Return success

**`forcePasswordReset(id: string, adminUserId: string, newPassword?: string, ip?, userAgent?)`**

- Check user exists
- Prevent resetting own password
- Generate temp password (if not provided)
- Hash new password
- Update AuthenticationProvider passwordHash
- Revoke all refresh tokens (force re-login)
- Log to audit: "user.password_reset"
- Return temp password

**`addToTenant(userId: string, tenantId: string, role: Role, adminUserId: string, ip?, userAgent?)`**

- Check user exists
- Check tenant exists
- Check user not already in tenant
- Create UserTenant relation with role
- Log to audit: "user.added_to_tenant"
- Return success

**`removeFromTenant(userId: string, tenantId: string, adminUserId: string, ip?, userAgent?)`**

- Check user exists
- Check user is in tenant
- Prevent removing from last tenant (user must have at least one)
- Delete UserTenant relation
- Log to audit: "user.removed_from_tenant"
- Return success

**`updateTenantRole(userId: string, tenantId: string, role: Role, adminUserId: string, ip?, userAgent?)`**

- Check user exists
- Check user is in tenant
- Update UserTenant.role
- Log to audit: "user.tenant_role_updated"
- Return success

**Bulk operations:**

**`bulkSuspend(userIds: string[], reason: string, adminUserId: string, ip?, userAgent?)`**

- Validate all users exist
- Filter out self and system users
- For each user: suspend (reuse suspend logic)
- Log each suspension
- Return count of suspended users

**`bulkActivate(userIds: string[], adminUserId: string, ip?, userAgent?)`**

- Validate all users exist
- For each user: activate (reuse activate logic)
- Log each activation
- Return count of activated users

**`bulkDelete(userIds: string[], deletedBy: string, ip?, userAgent?)`**

- Validate all users exist
- Filter out self and system users
- For each user: soft delete (reuse softDelete logic)
- Log each deletion
- Return count of deleted users

**`bulkRoleAssign(userIds: string[], tenantId: string, role: Role, adminUserId: string, ip?, userAgent?)`**

- Validate all users exist
- Validate tenant exists
- For each user: update or create UserTenant with role
- Log each assignment
- Return count of updated users

**Verification:**

- [ ] Suspend prevents login (tokens revoked)
- [ ] Activate restores access
- [ ] Password reset works
- [ ] Cannot suspend/delete self
- [ ] Cannot modify system user
- [ ] Tenant assignment works
- [ ] Role changes work
- [ ] Bulk operations work
- [ ] All operations logged

---

### Task 3A.5: UserAdminController

**File:** `apps/api/src/admin/user/user-admin.controller.ts`

**Setup:**

```typescript
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class UserAdminController {
  constructor(private readonly userAdminService: UserAdminService) {}
}
```

**Endpoints:**

| Method | Endpoint                             | Permission            | Description          |
| ------ | ------------------------------------ | --------------------- | -------------------- |
| GET    | `/admin/users`                       | `user:read`           | List users           |
| GET    | `/admin/users/:id`                   | `user:read`           | Get user details     |
| POST   | `/admin/users`                       | `user:write`          | Create user          |
| PATCH  | `/admin/users/:id`                   | `user:write`          | Update user          |
| DELETE | `/admin/users/:id`                   | `user:delete`         | Soft delete user     |
| POST   | `/admin/users/:id/suspend`           | `user:suspend`        | Suspend user         |
| POST   | `/admin/users/:id/activate`          | `user:suspend`        | Activate user        |
| POST   | `/admin/users/:id/reset-password`    | `user:reset-password` | Force password reset |
| POST   | `/admin/users/:id/tenants`           | `user:write`          | Add to tenant        |
| DELETE | `/admin/users/:id/tenants/:tenantId` | `user:write`          | Remove from tenant   |
| PATCH  | `/admin/users/:id/tenants/:tenantId` | `user:write`          | Update tenant role   |
| POST   | `/admin/users/bulk/suspend`          | `user:suspend`        | Bulk suspend         |
| POST   | `/admin/users/bulk/activate`         | `user:suspend`        | Bulk activate        |
| POST   | `/admin/users/bulk/delete`           | `user:delete`         | Bulk delete          |
| POST   | `/admin/users/bulk/role`             | `user:write`          | Bulk role assign     |

**Implementation pattern:**

```typescript
@Get()
@RequireAnyPermission('user:read')
async findAll(@Query(new ZodValidationPipe(userListQuerySchema)) query: any, @Req() req: any) {
  return this.userAdminService.findAll(query);
}

@Post(':id/suspend')
@Permissions('user:suspend')
async suspend(
  @Param('id') id: string,
  @Body(new ZodValidationPipe(suspendUserSchema)) body: any,
  @CurrentUser('userId') userId: string,
  @Req() req: any,
) {
  const ip = this.extractIp(req);
  const userAgent = req.headers['user-agent'];
  return this.userAdminService.suspend(id, body.reason, userId, ip, userAgent);
}
```

**Helper method:**

```typescript
private extractIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0] || 'unknown';
    }
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}
```

**Verification:**

- [ ] All endpoints properly decorated
- [ ] Guards apply to all endpoints
- [ ] Request validation works
- [ ] Proper error responses
- [ ] IP and user agent extracted

---

### Task 3A.6: Wire UserAdminModule

**File:** `apps/api/src/admin/user/user-admin.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { UserAdminController } from './user-admin.controller.js';
import { UserAdminService } from './user-admin.service.js';

@Module({
  imports: [AdminModule],
  controllers: [UserAdminController],
  providers: [UserAdminService],
  exports: [UserAdminService],
})
export class UserAdminModule {}
```

**Verification:**

- [ ] Module properly wired
- [ ] Dependencies injected correctly
- [ ] Service exported

---

### Task 3A.7: Update Auth Service for lastLoginAt

**File:** `apps/api/src/auth/auth.service.ts`

**Update `login()` method:**

```typescript
// After successful login, before creating tokens
await this.prisma.user.update({
  where: { id: user.id },
  data: { lastLoginAt: new Date() },
});
```

**Location:** After line 111 (after creating refresh token, before audit log)

**Verification:**

- [ ] lastLoginAt updated on login
- [ ] No performance impact

---

## Phase 3B: Frontend Implementation

### Task 3B.1: Server Actions

**File:** `apps/web/src/actions/users.ts`

**Actions:**

```typescript
export async function getUsersAction(
  params: UserListQuery,
): Promise<ActionResult<{ data: UserResponse[]; pagination: any }>>;
export async function getUserByIdAction(
  id: string,
): Promise<ActionResult<UserResponse & { recentAuditLogs?: any[] }>>;
export async function createUserAction(data: CreateUserInput): Promise<ActionResult<UserResponse>>;
export async function updateUserAction(
  id: string,
  data: UpdateUserInput,
): Promise<ActionResult<UserResponse>>;
export async function deleteUserAction(id: string): Promise<ActionResult<{ success: boolean }>>;
export async function suspendUserAction(
  id: string,
  reason: string,
): Promise<ActionResult<{ success: boolean }>>;
export async function activateUserAction(id: string): Promise<ActionResult<{ success: boolean }>>;
export async function resetPasswordAction(
  id: string,
  newPassword?: string,
): Promise<ActionResult<{ tempPassword: string }>>;
export async function addToTenantAction(
  userId: string,
  tenantId: string,
  role: string,
): Promise<ActionResult<{ success: boolean }>>;
export async function removeFromTenantAction(
  userId: string,
  tenantId: string,
): Promise<ActionResult<{ success: boolean }>>;
export async function updateTenantRoleAction(
  userId: string,
  tenantId: string,
  role: string,
): Promise<ActionResult<{ success: boolean }>>;
export async function bulkSuspendAction(
  userIds: string[],
  reason: string,
): Promise<ActionResult<{ count: number }>>;
export async function bulkActivateAction(
  userIds: string[],
): Promise<ActionResult<{ count: number }>>;
export async function bulkDeleteAction(userIds: string[]): Promise<ActionResult<{ count: number }>>;
export async function bulkRoleAssignAction(
  userIds: string[],
  tenantId: string,
  role: string,
): Promise<ActionResult<{ count: number }>>;
```

**Pattern:**

```typescript
export async function getUsersAction(
  params: UserListQuery,
): Promise<ActionResult<{ data: UserResponse[]; pagination: any }>> {
  try {
    const validated = userListQuerySchema.parse(params);
    const searchParams = new URLSearchParams();
    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const result = await serverApiClient.get<{ data: UserResponse[]; pagination: any }>(
      `/api/v1/admin/users?${searchParams.toString()}`,
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch users',
    };
  }
}
```

**Verification:**

- [ ] All actions work correctly
- [ ] Validation prevents invalid data
- [ ] Error messages displayed properly

---

### Task 3B.2: User List Page

**Files:**

- `apps/web/src/app/admin/users/page.tsx` - server component
- `apps/web/src/components/admin/user-list.tsx` - client component

**Page component:**

```typescript
export const metadata: Metadata = {
  title: 'Users | Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all users in the system</p>
        </div>
      </div>
      <UserList />
    </div>
  );
}
```

**UserList component features:**

- TanStack Table with columns:
  - Name/Email (avatar + name + email)
  - Tenants (list with role badges)
  - Role (global role badge)
  - Status (badge: Active/Suspended/Pending)
  - Created (date)
  - Last Login (date or "Never")
  - Actions (dropdown)
- Server-side pagination
- Search input (name/email)
- Filters: status, role, tenant
- Bulk selection with checkboxes
- Bulk actions bar (when items selected)
- Action dropdown (View, Suspend/Activate, Reset Password, Delete)
- Loading skeleton
- Empty state

**Bulk actions:**

- Select all checkbox
- Selected count display
- Bulk actions bar appears when items selected
- Actions: Suspend, Activate, Delete, Assign Role
- Each opens confirmation dialog

**Verification:**

- [ ] Table renders correctly
- [ ] Data loads from API
- [ ] Sorting works
- [ ] Pagination works
- [ ] Filters work
- [ ] Bulk selection works
- [ ] Actions dropdown works
- [ ] Loading states work

---

### Task 3B.3: Create User Dialog

**File:** `apps/web/src/components/admin/create-user-dialog.tsx`

**Features:**

- Dialog with form:
  - Email (required, validated)
  - Name (required)
  - Password (required, strength indicator)
  - Tenant (required, searchable dropdown)
  - Role (required, default: MEMBER)
- `react-hook-form` + `zodResolver` validation
- Real-time validation
- Password strength indicator (simple: weak/medium/strong)
- Tenant selection (dropdown with search)
- Submit via server action
- Toast on success/error
- Form reset on success

**Verification:**

- [ ] Form validation works
- [ ] User creates successfully
- [ ] Tenant assignment works
- [ ] Error handling works
- [ ] Toast notifications show

---

### Task 3B.4: User Detail Page

**Files:**

- `apps/web/src/app/admin/users/[id]/page.tsx` - server component
- `apps/web/src/components/admin/user-detail.tsx` - client component

**Page component:**

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getUserByIdAction(id);

  if (!result.success || !result.data) {
    return { title: 'User Not Found | Admin Dashboard' };
  }

  return {
    title: `${result.data.name || result.data.email} | Admin Dashboard`,
    robots: { index: false, follow: false },
  };
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getUserByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <UserDetail user={result.data} />;
}
```

**UserDetail component:**

- Header: user name, email, status badge, action buttons
- Tabs: Overview | Tenants | Activity

**Overview tab:**

- User info cards:
  - Email
  - Global Role
  - Status
  - Created date
  - Last login
  - System user badge (if applicable)
- Recent activity (last 20 audit logs)

**Tenants tab:**

- List of tenants user belongs to
- Each shows: tenant name, role badge, joined date
- Actions: Change Role, Remove from Tenant
- Add to Tenant button (opens dialog)

**Activity tab:**

- Last 20 audit logs with:
  - Action
  - Timestamp
  - IP address
  - Details (expandable)

**Verification:**

- [ ] All tabs render correctly
- [ ] User info accurate
- [ ] Tenant list works
- [ ] Actions work
- [ ] Activity shows
- [ ] Loading states work

---

### Task 3B.5: User Action Dialogs

**File:** `apps/web/src/components/admin/user-action-dialogs.tsx`

**Dialogs:**

**Suspend Dialog:**

- Reason textarea (required)
- Warning message
- Confirm button
- Error handling

**Activate Dialog:**

- Info message
- Confirm button
- Error handling

**Reset Password Dialog:**

- Optional new password input (or generate temp)
- Warning: "User will be logged out"
- Show temp password on success
- Copy button for temp password

**Delete Dialog:**

- Type email to confirm
- Danger warning
- Confirm button (destructive)
- Error handling

**Pattern:**

```typescript
interface UserActionDialogsProps {
  user: UserResponse;
  actionType: 'suspend' | 'activate' | 'reset-password' | 'delete';
  onClose: () => void;
  onSuccess: () => void;
}
```

**Verification:**

- [ ] All dialogs have confirmation
- [ ] Suspend works with reason
- [ ] Activate works
- [ ] Password reset works
- [ ] Delete requires confirmation
- [ ] Error handling works
- [ ] Toast notifications appear

---

### Task 3B.6: Tenant Management UI

**File:** `apps/web/src/components/admin/user-tenant-management.tsx`

**Components:**

**AddToTenantDialog:**

- Searchable tenant dropdown
- Role selection (default: MEMBER)
- Confirm button
- Error handling

**RemoveFromTenantDialog:**

- Warning message
- Confirm button
- Error handling

**UpdateTenantRoleDialog:**

- Role selection
- Confirm button
- Error handling

**Pattern:**

```typescript
interface AddToTenantDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

**Verification:**

- [ ] Add to tenant works
- [ ] Remove from tenant works
- [ ] Role change works
- [ ] All actions logged
- [ ] Error handling works

---

### Task 3B.7: Bulk Action Dialogs

**File:** `apps/web/src/components/admin/bulk-user-action-dialogs.tsx`

**Dialogs:**

**BulkSuspendDialog:**

- Show selected count
- Reason textarea (required)
- Confirm button
- Progress indicator
- Error handling

**BulkActivateDialog:**

- Show selected count
- Confirm button
- Progress indicator
- Error handling

**BulkDeleteDialog:**

- Show selected count
- Danger warning
- Confirm button (destructive)
- Progress indicator
- Error handling

**BulkRoleAssignDialog:**

- Show selected count
- Tenant selection (required)
- Role selection (required)
- Confirm button
- Progress indicator
- Error handling

**Pattern:**

```typescript
interface BulkSuspendDialogProps {
  userIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

**Verification:**

- [ ] Bulk suspend works
- [ ] Bulk activate works
- [ ] Bulk delete works
- [ ] Bulk role assign works
- [ ] Progress indicators work
- [ ] Error handling works

---

## Execution Order

1. **3A.1** Schema migration (blocks everything)
2. **3A.2** Shared schemas
3. **3A.3 + 3A.4 + 3A.5 + 3A.6** Service + Controller + Module
4. **3A.7** Update auth service for lastLoginAt
5. **Verify backend:** build, lint, test
6. **3B.1** Server actions
7. **3B.2 + 3B.3** User list + create dialog
8. **3B.4 + 3B.5** Detail page + action dialogs
9. **3B.6** Tenant management UI
10. **3B.7** Bulk action dialogs
11. **Verify frontend:** build, lint, test

---

## Verification Checklist

### Backend

- [ ] Schema migration applied
- [ ] All CRUD endpoints work
- [ ] Suspend/activate works
- [ ] Password reset works
- [ ] Tenant assignment works
- [ ] Role management works
- [ ] Bulk operations work
- [ ] Audit logs created
- [ ] Cannot suspend/delete self
- [ ] Cannot modify system user
- [ ] Sessions revoked on suspend
- [ ] lastLoginAt updated on login
- [ ] All tests pass

### Frontend

- [ ] User list renders
- [ ] Create user works
- [ ] User detail shows
- [ ] Suspend/activate works
- [ ] Password reset works
- [ ] Tenant management works
- [ ] Bulk actions work
- [ ] All dialogs work
- [ ] Toast notifications show
- [ ] Build succeeds

---

## Estimated Complexity

**Backend:** High

- 15 endpoints (CRUD + lifecycle + tenant + bulk)
- Complex business logic (cascade operations, validations)
- Transaction management
- Security checks (self-protection, system user protection)

**Frontend:** High

- Multiple dialogs (7+ types)
- Bulk operations UI
- Tenant management UI
- Complex table with filters

**Total:** ~3-4 days of focused work

---

## Key Files to Create/Modify

### Backend (new files)

1. `apps/api/src/admin/user/user-admin.service.ts`
2. `apps/api/src/admin/user/user-admin.controller.ts`
3. `apps/api/src/admin/user/user-admin.module.ts` (modify)

### Backend (modified files)

4. `packages/database/prisma/schema.prisma`
5. `packages/database/prisma/seed.ts`
6. `packages/shared/src/admin/user.schema.ts`
7. `packages/shared/src/index.ts`
8. `apps/api/src/auth/auth.service.ts`

### Frontend (new files)

9. `apps/web/src/actions/users.ts`
10. `apps/web/src/app/admin/users/page.tsx`
11. `apps/web/src/app/admin/users/[id]/page.tsx`
12. `apps/web/src/components/admin/user-list.tsx`
13. `apps/web/src/components/admin/user-detail.tsx`
14. `apps/web/src/components/admin/create-user-dialog.tsx`
15. `apps/web/src/components/admin/user-action-dialogs.tsx`
16. `apps/web/src/components/admin/user-tenant-management.tsx`
17. `apps/web/src/components/admin/bulk-user-action-dialogs.tsx`

**Total:** 17 files
