# Phase 6: Audit Logs & Monitoring — Complete Instructions

## Overview
This phase implements comprehensive audit logging and session management for security and compliance. You'll build a complete audit trail system with automatic logging, advanced filtering, export capabilities, and a full session management interface for monitoring and revoking user sessions.

---

## Task 6.1: Backend - Audit Service

### 6.1.1 AuditLogService for Recording Actions

**Objective:** Create a service that records all admin and user actions for audit purposes.

**File Location:** `apps/api/src/admin/audit/audit-log.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with Prisma client
  - Inject `Request` context for IP and user agent
  - Support async logging (non-blocking)
  - Buffer logs for batch writing (optional)

- **Core Methods:**

  **`log(data: AuditLogData)`**
  ```typescript
  interface AuditLogData {
    action: string  // 'user.created', 'tenant.suspended', etc.
    userId: string  // Who performed the action
    tenantId?: string  // Context (if applicable)
    details?: Record<string, any>  // Additional context
    ip?: string
    userAgent?: string
    metadata?: {
      requestId?: string
      sessionId?: string
      source?: 'admin' | 'api' | 'system'
    }
  }
  ```

  **`logBulk(entries: AuditLogData[])`**
  - Record multiple audit entries at once
  - Use for batch operations
  - Process asynchronously

  **`logWithContext(action: string, context: Record<string, any>)`**
  - Automatically capture user context
  - Extract from current request
  - Add to audit entry

- **Action Categories:**
  - **Authentication**: `auth.login`, `auth.logout`, `auth.failed`, `auth.refresh`
  - **User Management**: `user.created`, `user.updated`, `user.deleted`, `user.suspended`, `user.activated`, `user.password_reset`
  - **Tenant Management**: `tenant.created`, `tenant.updated`, `tenant.deleted`, `tenant.suspended`, `tenant.restored`
  - **Role Management**: `role.created`, `role.updated`, `role.deleted`, `role.permission_changed`
  - **Session Management**: `session.created`, `session.revoked`, `session.all_revoked`
  - **System**: `system.maintenance_on`, `system.maintenance_off`, `system.config_changed`, `system.backup_created`
  - **Security**: `security.ip_blocked`, `security.ip_whitelisted`, `security.alert_triggered`

- **Data Retention:**
  - Auto-purge logs older than retention period (default: 90 days)
  - Configurable via SystemConfig
  - Archive logs before deletion (optional)

- **Performance Optimization:**
  - Write logs asynchronously (don't block request)
  - Use database connection pooling
  - Batch inserts for high volume
  - Use indexes on: action, userId, tenantId, createdAt

**Verification:**
- [ ] Audit logs are created for all actions
- [ ] User context is captured automatically
- [ ] IP and user agent are recorded
- [ ] Bulk logging works
- [ ] Async logging doesn't block requests
- [ ] Data retention works
- [ ] Performance is acceptable

---

### 6.1.2 Interceptor/Decorator for Automatic Logging

**Objective:** Create interceptors and decorators for automatic audit logging.

**File Locations:**
- `apps/api/src/admin/audit/audit.interceptor.ts`
- `apps/api/src/admin/audit/audit.decorator.ts`

**Requirements:**

- **Audit Interceptor:**
  - Create `AuditInterceptor` that logs all controller methods
  - Apply globally or per-controller
  - Capture request/response data
  - Log success and error states
  - Don't log sensitive data (passwords, tokens)

- **Audit Decorator:**
  - Create `@Audit(action: string)` decorator
  - Use on controller methods
  - Example: `@Audit('user.created')`
  - Automatically log when method is called

- **Implementation:**
  ```typescript
  @Audit('user.created')
  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
  ```

- **Interceptor Logic:**
  - Pre-execution: Capture request data
  - Post-execution: Log with success/error status
  - Extract relevant data from response
  - Format details for audit

- **Data Masking:**
  - Don't log: passwords, tokens, credit cards
  - Mask sensitive fields in details
  - Use `@AuditExclude()` decorator for specific fields

- **Error Logging:**
  - Log error details (without stack trace in production)
  - Include error code and message
  - Log failed attempts for security

**Verification:**
- [ ] Interceptor captures all requests
- [ ] Decorator works on controller methods
- [ ] Audit logs are created automatically
- [ ] Sensitive data is masked
- [ ] Errors are logged
- [ ] Performance impact is minimal

---

### 6.1.3 Audit Log Retrieval with Filters

**Objective:** Implement comprehensive audit log retrieval with advanced filtering.

**File Location:** `apps/api/src/admin/audit/audit-log.service.ts` (extend previous)

**Requirements:**

- **Retrieval Methods:**

  **`getLogs(params: AuditLogQueryParams)`**
  ```typescript
  interface AuditLogQueryParams {
    page: number
    limit: number
    userId?: string  // Filter by user
    tenantId?: string  // Filter by tenant
    action?: string  // Filter by action (or array)
    actionCategory?: string  // Filter by category
    fromDate?: Date
    toDate?: Date
    search?: string  // Search in details
    ip?: string  // Filter by IP
    status?: 'success' | 'failure'  // Filter by status
    sortBy?: 'createdAt' | 'action'
    sortOrder?: 'asc' | 'desc'
  }
  ```

  **`getUserAudit(userId: string, params: AuditLogQueryParams)`**
  - Get audit logs for specific user
  - Include actions performed BY user and ON user

  **`getTenantAudit(tenantId: string, params: AuditLogQueryParams)`**
  - Get audit logs for specific tenant
  - Include tenant-wide actions

  **`getActionSummary(timeRange: TimeRange)`**
  - Get summary of actions performed
  - Group by action type
  - Return counts and trends

- **Advanced Features:**
  - **Full-text search**: Search within details JSON
  - **Filter by user agent**: Identify suspicious browsers
  - **Filter by request ID**: Group related requests
  - **Time series**: Group by hour/day/month
  - **Export**: Get data in CSV/JSON format

- **Performance Optimization:**
  - Use database indexes on all filter fields
  - Implement cursor-based pagination
  - Use PostgreSQL JSONB for details field
  - Materialized views for common queries

**Verification:**
- [ ] All filters work correctly
- [ ] Pagination works
- [ ] Search within details works
- [ ] Date range filtering works
- [ ] Performance is acceptable (< 500ms)
- [ ] Time series aggregation works

---

### 6.1.4 Audit Log Export Functionality

**Objective:** Implement audit log export to CSV, JSON, and PDF formats.

**File Location:** `apps/api/src/admin/audit/audit-export.service.ts`

**Requirements:**

- **Export Service:**
  - Injectable service
  - Support multiple formats: CSV, JSON, PDF
  - Generate exports asynchronously
  - Provide download links

- **Export Methods:**

  **`exportToCSV(params: AuditLogQueryParams)`**
  - Export filtered logs to CSV
  - Include columns: timestamp, user, action, details, ip, tenant
  - Escape special characters
  - Use streaming for large datasets

  **`exportToJSON(params: AuditLogQueryParams)`**
  - Export to JSON format
  - Include all fields
  - Pretty print option
  - Support NDJSON for streaming

  **`exportToPDF(params: AuditLogQueryParams)`**
  - Generate PDF report
  - Include header with report details
  - Paginated tables
  - Company branding (logo, name)
  - Secure with password (optional)

- **Export Job System:**
  - Create background jobs for large exports
  - Store generated files temporarily
  - Send email with download link
  - Clean up files after expiration (24 hours)

- **Export Options:**
  - **Date Range**: Custom or preset
  - **Columns**: Select specific columns
  - **Format**: CSV, JSON, PDF
  - **Compression**: ZIP for large exports
  - **Scheduling**: Schedule recurring exports

- **Rate Limiting:**
  - Limit export requests (e.g., 5 per hour)
  - Max rows per export (e.g., 100,000)
  - Warn user about large exports

**Verification:**
- [ ] Export to CSV works
- [ ] Export to JSON works
- [ ] Export to PDF works
- [ ] Large exports don't time out
- [ ] Rate limiting works
- [ ] Downloaded files are valid
- [ ] Data matches filters

---

## Task 6.2: Backend - Session Management

### 6.2.1 Session List Endpoint

**Objective:** Create endpoint to list all active user sessions.

**File Location:** `apps/api/src/admin/session/session-admin.controller.ts`

**Requirements:**

- **Endpoint Setup:**
  - `GET /api/v1/admin/sessions`
  - Apply `@UseGuards(AdminAuthGuard, AdminPermissionsGuard)`
  - Apply `@RequirePermission('admin:audit')`

- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 20, max: 100)
  - `userId` (optional): Filter by user
  - `tenantId` (optional): Filter by tenant
  - `status` (optional): 'active' | 'expired' | 'revoked'
  - `fromDate` (optional): Filter by created date
  - `toDate` (optional): Filter by created date

- **Response Format:**
  ```typescript
  {
    data: Array<{
      id: string
      userId: string
      user: {
        name: string
        email: string
        avatar?: string
      }
      tenantId?: string
      tenant?: {
        name: string
        slug: string
      }
      ip: string
      userAgent: string
      device: {
        type: 'desktop' | 'mobile' | 'tablet'
        browser: string
        os: string
      }
      createdAt: string
      lastActivityAt: string
      expiresAt: string
      status: 'active' | 'expired' | 'revoked'
      isCurrent: boolean
      familyId: string
    }>
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
    summary: {
      totalActive: number
      totalExpired: number
      totalRevoked: number
    }
  }
  ```

- **Implementation:**
  - Query RefreshToken table
  - Join with User table
  - Filter by revoked, expired
  - Calculate device info from user agent
  - Sort by lastActivityAt desc

**Verification:**
- [ ] Endpoint returns sessions list
- [ ] Filters work correctly
- [ ] User details are included
- [ ] Device info is parsed
- [ ] Summary statistics are accurate
- [ ] Pagination works

---

### 6.2.2 Revoke Specific Session

**Objective:** Create endpoint to revoke a specific session.

**File Location:** `apps/api/src/admin/session/session-admin.controller.ts`

**Requirements:**

- **Endpoint Setup:**
  - `DELETE /api/v1/admin/sessions/:sessionId`
  - Apply `@RequirePermission('admin:audit')`

- **Response Format:**
  ```typescript
  {
    success: boolean
    message: string
    revokedAt: string
    affected: {
      userId: string
      sessionId: string
      wasCurrent: boolean
    }
  }
  ```

- **Implementation:**
  - Validate session exists
  - Check if session is already revoked
  - Mark session as revoked
  - Clear refresh token cookie (if current session)
  - Log to audit: `session.revoked`
  - Invalidate session cache

- **Error Handling:**
  - 404: Session not found
  - 400: Session already revoked
  - 403: Cannot revoke own session (except via self-session management)

- **Post-Revocation Actions:**
  - Send notification to user (if configured)
  - Log to audit with reason
  - Record in user's session history

**Verification:**
- [ ] Session can be revoked
- [ ] Revoked session cannot be used
- [ ] Cookie is cleared (if current)
- [ ] Audit log is created
- [ ] Error handling works

---

### 6.2.3 Revoke All Sessions for User

**Objective:** Create endpoint to revoke all sessions for a user.

**File Location:** `apps/api/src/admin/session/session-admin.controller.ts`

**Requirements:**

- **Endpoint Setup:**
  - `DELETE /api/v1/admin/sessions/user/:userId`
  - Apply `@RequirePermission('admin:audit')`

- **Response Format:**
  ```typescript
  {
    success: boolean
    message: string
    revokedCount: number
    affected: {
      userId: string
      sessionsRevoked: number
      wasCurrentRevoked: boolean
    }
  }
  ```

- **Implementation:**
  - Validate user exists
  - Find all active sessions for user
  - Mark all as revoked
  - Clear refresh token cookies (if applicable)
  - Log to audit: `session.all_revoked`
  - Invalidate all session caches

- **Options:**
  - `excludeCurrent` (optional): Keep current session active
  - `reason` (optional): Why sessions were revoked
  - `notify` (optional): Send notification to user

- **Error Handling:**
  - 404: User not found
  - 400: No active sessions found
  - 403: Cannot revoke self (except via self-session management)

**Verification:**
- [ ] All user sessions are revoked
- [ ] User cannot use old sessions
- [ ] Cookies are cleared
- [ ] Audit log is created
- [ ] Notification is sent (if enabled)
- [ ] Error handling works

---

### 6.2.4 Session Expiration Monitoring

**Objective:** Implement session expiration monitoring and cleanup.

**File Location:** `apps/api/src/admin/session/session-monitor.service.ts`

**Requirements:**

- **Monitoring Service:**
  - Scheduled job running every hour
  - Clean expired sessions
  - Alert on unusual patterns
  - Generate session analytics

- **Cleanup Job:**
  - Find expired sessions (expiresAt < now)
  - Mark as expired (not revoked)
  - Delete expired sessions (optional, based on retention)
  - Log cleanup statistics

- **Alert Conditions:**
  - **Suspicious Activity**:
    - Same user with multiple concurrent sessions from different IPs
    - Same session from multiple IPs (session hijacking)
    - Multiple failed refresh attempts
    - Sessions from unusual locations (geolocation)

  - **Security Events**:
    - Session revocation after password change
    - Session reuse detection (token rotation)
    - Brute force attempts on refresh endpoint
    - Cookies from known malicious IPs

- **Analytics:**
  - **Session Statistics**:
    - Average session duration
    - Most active users (by sessions)
    - Peak concurrent sessions
    - Session distribution by device

  - **Trend Analysis**:
    - Session count over time
    - Login frequency trends
    - Device usage trends

- **Notification System:**
  - Alert admins on suspicious activity
  - Alert users on new login from unknown device
  - Alert on brute force attempts

**Verification:**
- [ ] Session cleanup works
- [ ] Expired sessions are removed
- [ ] Alerts trigger on suspicious activity
- [ ] Analytics are generated
- [ ] Notifications are sent
- [ ] Performance is acceptable

---

## Task 6.3: Frontend - Audit Pages

### 6.3.1 Audit Log Viewer with Filtering

**Objective:** Build a comprehensive audit log viewer with advanced filtering.

**File Location:** `apps/web/src/app/admin/audit/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/admin/audit`
  - Layout: Admin layout with sidebar
  - Page header: "Audit Logs" with export button
  - Filter panel (collapsible)
  - Data table with logs
  - Pagination controls

- **Filter Panel:**
  - **Search**: Full-text search in details
  - **User**: Searchable dropdown of users
  - **Tenant**: Searchable dropdown of tenants
  - **Action**: Multi-select dropdown of action types
  - **Category**: Multi-select dropdown of categories
  - **Date Range**: Date picker (from/to)
  - **IP Address**: Text input
  - **Status**: Select (All, Success, Failure)
  - **Clear All**: Reset all filters button

- **Data Table:**
  - **Columns**:
    - Timestamp (with relative time)
    - User (name + email)
    - Action (with icon)
    - Category (badge)
    - Tenant (if applicable)
    - IP Address (truncated)
    - Status (success/failure badge)
    - Actions (View Details)
  - **Features**:
    - Column sorting
    - Row selection
    - Column visibility toggle
    - Expandable row for details

- **Real-time Updates:**
  - Auto-refresh every 30 seconds (optional)
  - "New events" indicator
  - Click to reload

**Verification:**
- [ ] Audit log viewer renders
- [ ] All filters work
- [ ] Search works
- [ ] Date range works
- [ ] Data table shows logs
- [ ] Pagination works
- [ ] Auto-refresh works

---

### 6.3.2 Audit Log Detail View

**Objective:** Create a detailed view for individual audit log entries.

**File Location:** `apps/web/src/components/admin/audit-log-detail.tsx`

**Requirements:**

- **Detail Modal/Page:**
  - Show all fields of the audit log
  - Expandable JSON view of details
  - Timeline of related events
  - User information context

- **Display Fields:**
  - **Basic Info**:
    - Action name with icon
    - Category
    - Status (success/failure)
    - Timestamp (absolute + relative)
  - **User Info**:
    - Name, email, avatar
    - Role
    - Link to user detail
  - **Context**:
    - Tenant (if applicable)
    - IP Address
    - User Agent
    - Session ID
    - Request ID
  - **Details**:
    - Full JSON details
    - Formatted for readability
    - Copy to clipboard

- **Related Events:**
  - Show events by same user in time window
  - Show events for same resource (tenant, user)
  - Timeline visualization

- **Actions:**
  - Share link to audit entry
  - Download as JSON
  - Add note/comment (if implementing)
  - Flag for review

**Verification:**
- [ ] Detail view shows all fields
- [ ] JSON details are formatted
- [ ] User context is shown
- [ ] Related events are displayed
- [ ] Copy to clipboard works
- [ ] Download works

---

### 6.3.3 Export Audit Log UI

**Objective:** Build UI for exporting audit logs.

**File Location:** `apps/web/src/components/admin/audit-export-dialog.tsx`

**Requirements:**

- **Export Dialog:**
  - Open from audit page toolbar
  - Form for export options
  - Progress indicator
  - Download link when ready

- **Export Options:**
  - **Date Range**: Same as filters
  - **Format**: CSV, JSON, PDF
  - **Columns**: Select which columns to include
  - **Compression**: ZIP (for large exports)
  - **Include Details**: Toggle for details field
  - **Limit**: Max rows to export

- **Export Process:**
  1. User selects options and submits
  2. Show progress indicator
  3. Background job generates export
  4. Notification when ready
  5. Download link available
  6. File expires after 24 hours

- **UI States:**
  - **Idle**: Form ready for input
  - **Preparing**: Validating options
  - **Processing**: Showing progress
  - **Ready**: Download link available
  - **Error**: Display error message

- **Job Status:**
  - Queue position
  - Estimated time remaining
  - Cancel button
  - View status later option

**Verification:**
- [ ] Export dialog opens
- [ ] All options work
- [ ] Progress indicator shows
- [ ] Download link works
- [ ] File is valid
- [ ] Error handling works

---

### 6.3.4 Security Alerts Dashboard

**Objective:** Create a security alerts dashboard for monitoring suspicious activity.

**File Location:** `apps/web/src/app/admin/security/alerts/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/admin/security/alerts`
  - Overview of security events
  - Severity-based prioritization
  - Action buttons for responding

- **Alert Types:**
  - **High Severity**:
    - Multiple failed login attempts (brute force)
    - Session hijacking detected
    - Unauthorized access attempts
    - Suspicious IP activity
  - **Medium Severity**:
    - Unusual login location
    - Multiple sessions from different IPs
    - Failed MFA attempts (if implemented)
  - **Low Severity**:
    - Password change notification
    - New device login
    - Session expiration

- **Alert Display:**
  - **Alert Card**:
    - Severity badge (High/Medium/Low)
    - Title and description
    - Timestamp
    - Affected user/tenant
    - Status (New, Acknowledged, Resolved)
  - **Actions**:
    - Acknowledge
    - Resolve
    - View details
    - Take action (e.g., suspend user)

- **Dashboard Widgets:**
  - **Alert Summary**: Count by severity
  - **Alert Trend**: Alerts over time (chart)
  - **Recent Alerts**: Last 10 alerts
  - **Top Users**: Users with most alerts

- **Alert Management:**
  - Change status (New → Acknowledged → Resolved)
  - Add notes to alerts
  - Assign to team member
  - Mute/suppress recurring alerts

- **Alert Settings:**
  - Configure alert rules
  - Set severity thresholds
  - Enable/disable alert types
  - Configure notification preferences

**Verification:**
- [ ] Alerts dashboard renders
- [ ] Severity badges work
- [ ] Alert actions work
- [ ] Summary widgets work
- [ ] Trend chart works
- [ ] Alert management works
- [ ] Settings work

---

## Task 6.4: Frontend - Session UI

### 6.4.1 User Session List

**Objective:** Build a list of user sessions for monitoring.

**File Location:** `apps/web/src/app/admin/users/[id]/sessions/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/admin/users/:userId/sessions`
  - Tab within user detail view
  - List of all user sessions

- **Session Display:**
  - **Session Card**:
    - Device type icon (Desktop/Mobile/Tablet)
    - Browser + OS
    - IP Address (truncated)
    - Created at (with relative time)
    - Last activity (with relative time)
    - Expires at (with relative time)
    - Status badge (Active/Expired/Revoked)
    - Is current session indicator
  - **Actions**:
    - Revoke session (button)
    - View details (expanded)

- **Session Information:**
  - Session ID (copyable)
  - Device fingerprint (if available)
  - Location (geolocation from IP)
  - Session duration
  - Family ID (for token rotation)

- **Sorting and Filtering:**
  - Sort by: Created, Last activity, Expires
  - Filter by: Status (Active/Expired/Revoked)
  - Search by: IP, Device

- **Actions:**
  - Revoke individual session
  - Revoke all sessions (with confirmation)
  - Force logout user (revoke all + clear cookie)

**Verification:**
- [ ] Session list renders
- [ ] Device info is displayed
- [ ] Status badges work
- [ ] Revoke session works
- [ ] Revoke all works
- [ ] Filtering works
- [ ] Sorting works

---

### 6.4.2 Session Revocation UI

**Objective:** Create UI for session revocation with confirmation.

**File Location:** `apps/web/src/components/admin/session-revoke-dialog.tsx`

**Requirements:**

- **Revoke Dialog:**
  - **Individual Revoke**:
    - Show session details
    - Confirm revocation
    - Optional reason field
    - "Also notify user" checkbox
    - Confirm button

  - **Bulk Revoke (All Sessions)**:
    - Show user details
    - Show session count
    - Warning: "User will be logged out everywhere"
    - "Exclude current session" checkbox (optional)
    - Reason field (required)
    - "Send notification" checkbox
    - Confirm button (red)

  - **Bulk Revoke (Selected Sessions)**:
    - Show selected session count
    - Same options as individual
    - Process in batches

- **Confirmation Steps:**
  1. Show session/user details
  2. Confirm action with checkbox
  3. (Optional) Type "REVOKE" to confirm for all sessions
  4. Process request
  5. Show success/error state

- **UI States:**
  - **Idle**: Ready for confirmation
  - **Processing**: Loading spinner
  - **Success**: Checkmark, close after 2 seconds
  - **Error**: Error message, retry option

**Verification:**
- [ ] Revoke dialog works
- [ ] Confirmation steps work
- [ ] Reason is required
- [ ] Notification checkbox works
- [ ] Bulk revoke works
- [ ] Processing state works
- [ ] Error handling works

---

### 6.4.3 Active Sessions Widget

**Objective:** Create a widget showing active sessions.

**File Location:** `apps/web/src/components/admin/active-sessions-widget.tsx`

**Requirements:**

- **Widget Setup:**
  - Display on admin dashboard
  - Auto-refresh every 30 seconds
  - Compact design

- **Widget Content:**
  - **Summary**:
    - Total active sessions
    - Unique users with active sessions
    - New sessions in last hour
  - **Top Active Users**:
    - Avatar, name, email
    - Session count
    - Last activity time
  - **Recent Sessions**:
    - User name and device
    - Timestamp
    - Status indicator (active/inactive)

- **Display Options:**
  - **Card View**: Summary cards with counts
  - **List View**: List of recent sessions
  - **Expandable**: Click to view more

- **Actions:**
  - "View All Sessions" link
  - Quick revoke from widget (if user clicked)
  - Filter by user (optional)

- **Visual Design:**
  - Color coding: Active (green), Expiring soon (yellow)
  - Avatar stack for users with sessions
  - Animated refresh indicator

**Verification:**
- [ ] Widget renders on dashboard
- [ ] Summary counts are accurate
- [ ] Top active users show
- [ ] Recent sessions show
- [ ] Auto-refresh works
- [ ] "View All" link works
- [ ] Responsive design works

---

## Phase 6 Verification Checklist

Before proceeding to Phase 7, verify:

- [ ] AuditLogService records all actions
- [ ] Interceptor/decorator works for automatic logging
- [ ] Audit log retrieval with filters works
- [ ] Audit log export works (CSV, JSON, PDF)
- [ ] Session list endpoint works
- [ ] Session revocation works (single + all)
- [ ] Session expiration monitoring works
- [ ] Audit log viewer renders with filtering
- [ ] Audit log detail view works
- [ ] Export audit log UI works
- [ ] Security alerts dashboard works
- [ ] User session list works
- [ ] Session revocation UI works
- [ ] Active sessions widget works
- [ ] All tests pass
- [ ] No ESLint errors
- [ ] Build succeeds

---

## Phase 6 Completion Criteria

- [ ] AuditLogService for recording actions
- [ ] Audit interceptor/decorator
- [ ] Audit log retrieval with filters
- [ ] Audit log export functionality
- [ ] Session list endpoint
- [ ] Revoke specific session endpoint
- [ ] Revoke all sessions endpoint
- [ ] Session expiration monitoring
- [ ] Audit log viewer with filtering
- [ ] Audit log detail view
- [ ] Export audit log UI
- [ ] Security alerts dashboard
- [ ] User session list
- [ ] Session revocation UI
- [ ] Active sessions widget
- [ ] Audit logging for all admin actions

---

## Phase 6 Tips & Best Practices

1. **Data Retention**: Implement automatic log rotation based on retention policy
2. **Performance**: Use database indexes and batch inserts for high-volume logging
3. **Security**: Never log sensitive data (passwords, tokens, credit cards)
4. **Compliance**: Ensure audit logs meet regulatory requirements (GDPR, SOC2)
5. **Search**: Implement full-text search for efficient log exploration
6. **Export**: Use streaming for large exports to prevent memory issues
7. **Alerts**: Don't overwhelm admins with alerts; use intelligent grouping
8. **Session Security**: Always log session creation and revocation events
9. **Real-time**: Consider WebSocket for real-time session updates
10. **Audit Trail**: Ensure all admin actions are logged for accountability

---

**Ready for Phase 7?** Let me know when Phase 6 is complete!