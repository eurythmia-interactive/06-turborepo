# Admin Portal User Guide

## Default User Credentials

The system comes with three pre-configured users:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| superadmin@example.com | SuperAdmin123! | SUPER_ADMIN | Full system access, can manage everything |
| admin@example.com | Admin123! | ADMIN | Can manage users, tenants, and roles |
| member@example.com | Member123! | MEMBER | Basic access, limited permissions |

**Note:** The superadmin and admin users can access the admin portal. The member user cannot access admin features.

---

## Login / Logout

### Login
1. Start the application: `pnpm dev`
2. Open your browser and navigate to: http://localhost:3000/admin/login
3. Enter the email and password from the credentials table above
4. Click "Sign In"
5. You will be redirected to the admin dashboard

### Logout
1. Click on your profile icon in the top-right corner
2. Select "Logout" from the dropdown menu
3. You will be redirected to the login page

---

## Dashboard Overview

After logging in, you'll see the main dashboard at `/admin` which displays:

- **Metric Cards**: Total users, active users, new users today/week, total tenants, sessions today
- **User Growth Chart**: Visual representation of user registration trends
- **Tenant Activity Chart**: Shows login activity over time
- **Recent Activity Feed**: Timeline of recent system events
- **Quick Actions**: Shortcut buttons for common tasks

The dashboard auto-refreshes every 30 seconds. You can also manually refresh using the refresh button.

---

## Managing Tenants

### View All Tenants
1. Click "Tenants" in the left sidebar
2. You'll see a list of all tenants with their status, plan, and user count

### Create a New Tenant
1. Go to the Tenants page
2. Click the "Create Tenant" button in the top-right
3. Fill in the form:
   - **Name**: Display name for the tenant
   - **Slug**: URL-friendly identifier (lowercase, hyphens only)
   - **Plan**: Choose from Free, Pro, or Enterprise
   - **Admin Email**: Optional email for the tenant admin
4. Click "Create"
5. The tenant will be created and appear in the list

### View Tenant Details
1. Click on a tenant's name in the list
2. You'll see detailed information including:
   - Basic info (name, slug, plan, status)
   - Statistics (user count, audit log count)
   - Recent audit logs for this tenant

### Suspend a Tenant
1. Go to the tenant detail page
2. Click the "Actions" dropdown
3. Select "Suspend Tenant"
4. Enter a reason for suspension
5. Click "Suspend"
6. The tenant will be marked as suspended and users won't be able to access it

### Restore a Suspended Tenant
1. Go to the tenant detail page
2. Click the "Actions" dropdown
3. Select "Restore Tenant"
4. Click "Restore"
5. The tenant will be reactivated

### Delete a Tenant
1. Go to the tenant detail page
2. Click the "Actions" dropdown
3. Select "Delete Tenant"
4. Type the tenant name to confirm
5. Click "Delete"
6. The tenant will be soft-deleted (can be restored from database)

---

## Managing Users

### View All Users
1. Click "Users" in the left sidebar
2. You'll see a list of all users with their role, status, and tenant assignments

### Create a New User
1. Go to the Users page
2. Click the "Create User" button in the top-right
3. Fill in the form:
   - **Email**: User's email address (must be unique)
   - **Name**: User's display name
   - **Password**: Initial password (user can change later)
   - **Tenant**: Select which tenant to assign the user to
   - **Role**: Choose the user's role (Member, Admin, or Guest)
4. Click "Create"
5. The user will be created and receive the specified role in the selected tenant

### View User Details
1. Click on a user's name in the list
2. You'll see detailed information including:
   - Profile information
   - Tenant memberships and roles
   - Recent activity/audit logs
   - Session information

### Suspend a User
1. Go to the user detail page
2. Click the "Actions" dropdown
3. Select "Suspend User"
4. Enter a reason for suspension
5. Click "Suspend"
6. The user will be logged out and won't be able to log in

### Activate a Suspended User
1. Go to the user detail page
2. Click the "Actions" dropdown
3. Select "Activate User"
4. Click "Activate"
5. The user will be able to log in again

### Reset User Password
1. Go to the user detail page
2. Click the "Actions" dropdown
3. Select "Reset Password"
4. A temporary password will be generated
5. Copy the password and share it securely with the user
6. The user will be logged out and must use the new password

### Delete a User
1. Go to the user detail page
2. Click the "Actions" dropdown
3. Select "Delete User"
4. Type the user's email to confirm
5. Click "Delete"
6. The user will be soft-deleted (can be restored from database)

---

## Managing Roles

### View All Roles
1. Click "Roles" in the left sidebar
2. You'll see a list of all roles (both system and custom)

### Create a Custom Role
1. Go to the Roles page
2. Click the "Create Role" button
3. Fill in the form:
   - **Name**: Role name (must be unique)
   - **Description**: Optional description
   - **Permissions**: Select specific permissions from the matrix
4. Click "Create"
5. The custom role will be available for assignment to users

### Edit a Role
1. Click on a role in the list
2. Modify the name, description, or permissions
3. Click "Save Changes"
4. Users with this role will immediately receive updated permissions

### Assign a Custom Role to a User
1. Go to the user detail page
2. In the "Custom Role" section, click "Edit"
3. Select a custom role from the dropdown
4. Click "Save"
5. The user will now have the permissions defined in that custom role

---

## Viewing Audit Logs

### Access Audit Logs
1. Click "Audit Logs" in the left sidebar
2. You'll see a chronological list of all system events

### Filter Audit Logs
Use the filter panel to narrow down results:
- **Search**: Search in log details
- **User**: Filter by specific user
- **Tenant**: Filter by specific tenant
- **Action**: Filter by action type (auth, user, tenant, role, etc.)
- **Date Range**: Filter by date range
- **IP Address**: Filter by IP address

### Export Audit Logs
1. Click the "Export" button
2. Choose format (CSV or JSON)
3. Set date range and other filters
4. Click "Export"
5. The file will be downloaded

---

## Managing Sessions

### View All Sessions
1. Click "Sessions" in the left sidebar
2. You'll see a list of all active user sessions with:
   - User information
   - Device/browser details
   - IP address
   - Creation and expiration times
   - Status (active, expired, revoked)

### Revoke a Session
1. Find the session in the list
2. Click the "Revoke" button
3. Confirm the action
4. The user will be logged out immediately

### Revoke All Sessions for a User
1. Go to the user detail page
2. Click "Revoke All Sessions"
3. Confirm the action
4. All active sessions for that user will be terminated

---

## Role Permissions Overview

### SUPER_ADMIN
- Full access to all features
- Can manage system settings
- Can view and manage all users, tenants, and roles
- Cannot be deleted or suspended

### ADMIN
- Can manage users (create, update, delete, suspend)
- Can manage tenants (create, update, delete, suspend)
- Can manage roles (create, update, delete)
- Can view audit logs
- Can manage sessions
- Cannot access system settings

### MEMBER
- Can view their own profile
- Can view tenant information
- Cannot access admin features
- Cannot manage other users or tenants

### GUEST
- Read-only access to assigned resources
- Cannot make any changes
- Cannot access admin features

---

## Troubleshooting

### Cannot Login
- Verify the email and password are correct
- Check if the user account is suspended
- Ensure the database is running: `pnpm db:verify`
- Reset the password using the seed script if needed

### Cannot Access Admin Portal
- Only SUPER_ADMIN and ADMIN roles can access the admin portal
- MEMBER and GUEST roles will be redirected away
- Check the user's role in the database

### Database Connection Issues
- Run `pnpm db:up` to start the database
- Run `pnpm db:verify` to check the connection
- Check Docker is running
- View logs with `pnpm db:logs`

---

## Quick Reference

### Start Development Environment
```bash
pnpm dev
```

### Access Points
- **Web Application**: http://localhost:3000
- **Admin Portal**: http://localhost:3000/admin
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api

### Common Tasks
- **Create User**: Users page → Create User button
- **Create Tenant**: Tenants page → Create Tenant button
- **View Logs**: Audit Logs in sidebar
- **Manage Sessions**: Sessions in sidebar
- **Reset Password**: User detail page → Actions → Reset Password
