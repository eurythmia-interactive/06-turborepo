# Phase 5: Admin Dashboard & Analytics — Complete Instructions

## Overview
This phase implements a comprehensive admin dashboard with real-time metrics, interactive charts, and actionable insights. You'll build backend analytics services for aggregating metrics, user growth tracking, tenant activity monitoring, and API usage statistics. The frontend will feature metric cards, growth charts, activity feeds, and quick action widgets.

---

## Task 5.1: Backend - Analytics Service

### 5.1.1 Metrics Aggregation Service

**Objective:** Create a service that aggregates key platform metrics.

**File Location:** `apps/api/src/admin/analytics/metrics-aggregation.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with Prisma client
  - Inject `AuditLogService` for activity data
  - Inject `CacheService` for performance
  - Use database aggregations for efficiency

- **Core Metrics:**

  **User Metrics:**
  - **Total Users**: Count of all users (excluding deleted)
  - **Active Users**: Users with login in last 30 days
  - **New Users Today**: Users created today
  - **New Users This Week**: Users created in last 7 days
  - **Users by Status**: Count by ACTIVE, SUSPENDED, PENDING
  - **Users by Role**: Count by role (SUPER_ADMIN, ADMIN, MEMBER, GUEST)

  **Tenant Metrics:**
  - **Total Tenants**: Count of all active tenants
  - **New Tenants Today**: Tenants created today
  - **New Tenants This Week**: Tenants created in last 7 days
  - **Tenants by Status**: Active vs Suspended
  - **Average Users per Tenant**: Total users / Total tenants

  **Activity Metrics:**
  - **Total Sessions Today**: Logins in last 24 hours
  - **Total Sessions This Week**: Logins in last 7 days
  - **Active Tenants Today**: Tenants with user activity today
  - **Peak Activity Time**: Hour with most activity

  **System Metrics:**
  - **Total API Requests**: All-time API calls
  - **API Requests Today**: API calls in last 24 hours
  - **Error Rate**: Percentage of failed requests
  - **Average Response Time**: Mean API response time

- **Aggregation Methods:**

  **`getMetrics(timeRange: TimeRange, granularity: Granularity)`**
  - Parameters:
    - `timeRange`: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'
    - `granularity`: 'hour' | 'day' | 'week' | 'month'
  - Return aggregated metrics object
  - Use database aggregations for performance

  **`calculateGrowthRate(current: number, previous: number)`**
  - Calculate percentage change
  - Return positive/negative with percentage

  **`getTrendData(metric: string, timeRange: TimeRange)`**
  - Fetch historical data for trend analysis
  - Return array of data points with timestamps

- **Performance Optimization:**
  - Cache metrics with TTL: 5 minutes
  - Use database indexes on: createdAt, updatedAt, lastLoginAt
  - Batch queries for multiple metrics
  - Use raw SQL for complex aggregations

- **Caching Strategy:**
  - Cache key: `metrics:{timeRange}:{granularity}`
  - Invalidate on: user creation, tenant creation, login events
  - Pre-warm cache on application startup

**Verification:**
- [ ] All metrics are calculated correctly
- [ ] Time ranges work properly
- [ ] Caching works
- [ ] Performance is acceptable (< 2 seconds)
- [ ] Database indexes are used
- [ ] Growth rates are accurate

---

### 5.1.2 User Growth Analytics

**Objective:** Track user growth trends over time.

**File Location:** `apps/api/src/admin/analytics/user-growth.service.ts`

**Requirements:**

- **Service Setup:**
  - Extend MetricsAggregationService
  - Focus on user-related metrics
  - Support time-series analysis

- **Growth Metrics:**

  **Daily Growth:**
  ```typescript
  {
    date: string // '2024-01-01'
    newUsers: number
    totalUsers: number
    cumulativeGrowth: number
  }
  ```

  **Weekly Growth:**
  ```typescript
  {
    weekStart: string // '2024-01-01'
    weekEnd: string // '2024-01-07'
    newUsers: number
    totalUsers: number
    growthRate: number // percentage
  }
  ```

  **Monthly Growth:**
  ```typescript
  {
    month: string // '2024-01'
    newUsers: number
    totalUsers: number
    growthRate: number // percentage
    retentionRate: number // percentage
  }
  ```

- **Implementation Methods:**

  **`getDailyGrowth(days: number, timezone: string)`**
  - Get user growth for last N days
  - Group by date
  - Include cumulative totals

  **`getWeeklyGrowth(weeks: number)`**
  - Get user growth for last N weeks
  - Group by week
  - Calculate week-over-week growth

  **`getMonthlyGrowth(months: number)`**
  - Get user growth for last N months
  - Group by month
  - Calculate month-over-month growth

  **`getRetentionRate(cohortSize: number)`**
  - Calculate user retention
  - Cohort analysis by signup date
  - Return retention percentages

- **Data Processing:**
  - Use Prisma grouping with `_count`
  - Fill missing dates with zero
  - Calculate cumulative totals
  - Format for chart consumption

- **Performance Optimization:**
  - Use materialized views for large datasets
  - Cache daily growth data
  - Use database date functions

**Verification:**
- [ ] Daily growth data is accurate
- [ ] Weekly growth works
- [ ] Monthly growth works
- [ ] Retention rates are calculated
- [ ] Missing dates are handled
- [ ] Performance is acceptable

---

### 5.1.3 Tenant Activity Metrics

**Objective:** Track tenant activity and engagement metrics.

**File Location:** `apps/api/src/admin/analytics/tenant-activity.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with Prisma client
  - Focus on tenant-level metrics
  - Support tenant filtering

- **Activity Metrics:**

  **Tenant Engagement:**
  - **Active Tenants**: Tenants with user activity in period
  - **Dormant Tenants**: No activity in 30/60/90 days
  - **New Tenants**: Created in period
  - **Churned Tenants**: Suspended/deleted in period

  **User Activity Per Tenant:**
  - **Average Active Users**: Mean active users per tenant
  - **User Distribution**: Histogram of users per tenant
  - **Login Frequency**: Average logins per user per tenant

  **Tenant Health:**
  - **Engagement Score**: 0-100 based on activity
  - **Retention Score**: User retention within tenant
  - **Growth Score**: User growth rate in tenant

- **Implementation Methods:**

  **`getActiveTenantCount(timeRange: TimeRange)`**
  - Count tenants with user activity
  - Use `lastLoginAt` from users
  - Group by tenant

  **`getTenantEngagement(tenantId: string, timeRange: TimeRange)`**
  - Get detailed engagement metrics for a specific tenant
  - Include: active users, sessions, feature usage

  **`getTenantActivityHeatmap(timeRange: TimeRange)`**
  - Generate heatmap data
  - Day × Hour grid
  - Color intensity based on activity

  **`getTopTenants(metric: string, limit: number)`**
  - Rank tenants by: users, activity, growth
  - Return top N tenants

- **Data Sources:**
  - Audit logs for activity events
  - Session logs for login activity
  - UserTenant relations for membership

**Verification:**
- [ ] Active tenant count is accurate
- [ ] Engagement metrics work
- [ ] Heatmap data is generated
- [ ] Top tenants ranking works
- [ ] Performance is acceptable

---

### 5.1.4 API Usage Statistics

**Objective:** Track API usage and performance metrics.

**File Location:** `apps/api/src/admin/analytics/api-usage.service.ts`

**Requirements:**

- **Service Setup:**
  - Injectable service with logging middleware
  - Use request logs for metrics
  - Support endpoint-level tracking

- **API Metrics:**

  **Request Statistics:**
  - **Total Requests**: All-time API calls
  - **Requests by Endpoint**: Count per endpoint
  - **Requests by Method**: GET, POST, PUT, DELETE, PATCH
  - **Requests by Status**: 2xx, 4xx, 5xx
  - **Requests by Tenant**: API usage per tenant

  **Performance Metrics:**
  - **Average Response Time**: Mean request duration
  - **P95 Response Time**: 95th percentile
  - **P99 Response Time**: 99th percentile
  - **Slow Endpoints**: Endpoints > 1 second
  - **Error Rate**: Percentage of failed requests

  **Usage Patterns:**
  - **Peak Hours**: Highest request volume times
  - **Busy Days**: Days with most requests
  - **Endpoint Popularity**: Most used endpoints
  - **Tenant API Usage**: API calls per tenant

- **Implementation Methods:**

  **`getApiUsage(timeRange: TimeRange)`**
  - Aggregate API usage metrics
  - Include: total requests, errors, performance

  **`getEndpointStats(timeRange: TimeRange)`**
  - Per-endpoint statistics
  - Include: count, avg time, error rate

  **`getTenantApiUsage(tenantId: string, timeRange: TimeRange)`**
  - API usage for specific tenant
  - Include: requests by endpoint, performance

  **`getPerformanceMetrics(timeRange: TimeRange)`**
  - Detailed performance analysis
  - Include: percentiles, slow endpoints

- **Data Collection:**
  - Use middleware to log requests
  - Store in database or logging service
  - Use sampling for high-volume APIs

- **Data Retention:**
  - Keep detailed logs for 30 days
  - Aggregate older data (keep monthly summaries)
  - Purge old data based on retention policy

**Verification:**
- [ ] Request counts are accurate
- [ ] Response times are tracked
- [ ] Endpoint statistics work
- [ ] Performance percentiles are calculated
- [ ] Tenant API usage works
- [ ] Data retention works

---

## Task 5.2: Backend - Endpoints

### 5.2.1 GET /admin/dashboard/metrics

**Objective:** Create endpoint for dashboard metrics.

**File Location:** `apps/api/src/admin/analytics/analytics.controller.ts`

**Requirements:**

- **Endpoint Setup:**
  - `GET /api/v1/admin/dashboard/metrics`
  - Apply `@UseGuards(AdminAuthGuard, AdminPermissionsGuard)`
  - Apply `@RequirePermission('admin:access')`

- **Query Parameters:**
  - `timeRange` (optional): 'today' | 'week' | 'month' | 'quarter' | 'year'
  - Default: 'month'

- **Response Format:**
  ```typescript
  {
    users: {
      total: number
      active: number
      newToday: number
      newThisWeek: number
      growth: number // percentage
      byStatus: { ACTIVE: number, SUSPENDED: number, PENDING: number }
      byRole: { SUPER_ADMIN: number, ADMIN: number, MEMBER: number, GUEST: number }
    },
    tenants: {
      total: number
      active: number
      newToday: number
      newThisWeek: number
      suspended: number
      avgUsersPerTenant: number
    },
    activity: {
      totalSessionsToday: number
      activeTenantsToday: number
      peakHour: number
      trend: number // percentage change
    },
    api: {
      totalRequests: number
      requestsToday: number
      errorRate: number
      avgResponseTime: number
    },
    period: {
      start: string
      end: string
      label: string
    }
  }
  ```

- **Error Handling:**
  - 400: Invalid timeRange parameter
  - 403: Insufficient permissions
  - 500: Internal server error

**Verification:**
- [ ] Endpoint returns all metrics
- [ ] Time range parameter works
- [ ] Metrics are accurate
- [ ] Response format matches schema
- [ ] Error handling works

---

### 5.2.2 GET /admin/dashboard/growth

**Objective:** Create endpoint for growth analytics data.

**File Location:** `apps/api/src/admin/analytics/analytics.controller.ts`

**Requirements:**

- **Endpoint Setup:**
  - `GET /api/v1/admin/dashboard/growth`
  - Apply admin guards and permissions

- **Query Parameters:**
  - `metric` (required): 'users' | 'tenants'
  - `period` (optional): 'day' | 'week' | 'month'
  - Default: 'day'
  - `limit` (optional): number of data points
  - Default: 30

- **Response Format:**
  ```typescript
  {
    metric: string
    period: string
    data: Array<{
      date: string
      new: number
      cumulative: number
      growthRate?: number
    }>
    summary: {
      total: number
      average: number
      peak: { date: string, value: number }
      growth: number // percentage
    }
  }
  ```

- **Implementation:**
  - Use UserGrowthService for user data
  - Use TenantActivityService for tenant data
  - Format for chart consumption
  - Include trend calculations

**Verification:**
- [ ] Endpoint returns growth data
- [ ] Metric parameter works
- [ ] Period parameter works
- [ ] Data is formatted for charts
- [ ] Summary statistics are accurate

---

### 5.2.3 GET /admin/dashboard/activity

**Objective:** Create endpoint for activity data visualization.

**File Location:** `apps/api/src/admin/analytics/analytics.controller.ts`

**Requirements:**

- **Endpoint Setup:**
  - `GET /api/v1/admin/dashboard/activity`
  - Apply admin guards and permissions

- **Query Parameters:**
  - `type` (required): 'sessions' | 'api' | 'users'
  - `period` (optional): 'day' | 'week' | 'month'
  - Default: 'day'
  - `limit` (optional): number of data points
  - Default: 24 (for day), 7 (for week), 30 (for month)

- **Response Format:**
  ```typescript
  {
    type: string
    period: string
    data: Array<{
      timestamp: string
      value: number
      label: string
    }>
    summary: {
      total: number
      average: number
      peak: { timestamp: string, value: number }
    }
  }
  ```

- **Activity Types:**
  - **sessions**: Login activity over time
  - **api**: API request volume over time
  - **users**: New user registrations over time

**Verification:**
- [ ] Endpoint returns activity data
- [ ] Type parameter works
- [ ] Period parameter works
- [ ] Data is formatted for charts
- [ ] Summary statistics are accurate

---

### 5.2.4 GET /admin/dashboard/recent

**Objective:** Create endpoint for recent activity feed.

**File Location:** `apps/api/src/admin/analytics/analytics.controller.ts`

**Requirements:**

- **Endpoint Setup:**
  - `GET /api/v1/admin/dashboard/recent`
  - Apply admin guards and permissions

- **Query Parameters:**
  - `limit` (optional): number of events
  - Default: 20
  - `type` (optional): filter by event type
  - Default: all

- **Response Format:**
  ```typescript
  {
    events: Array<{
      id: string
      action: string
      user: {
        id: string
        name: string
        email: string
        avatar?: string
      }
      tenant?: {
        id: string
        name: string
        slug: string
      }
      details: Record<string, any>
      ip: string
      userAgent: string
      timestamp: string
      timeAgo: string
    }>
    total: number
    hasMore: boolean
  }
  ```

- **Event Types to Include:**
  - User login/logout
  - User creation/deletion
  - Tenant creation/deletion
  - Role changes
  - Permission changes
  - Suspension/activation events
  - System events

**Verification:**
- [ ] Endpoint returns recent events
- [ ] Limit parameter works
- [ ] Type filtering works
- [ ] User details are included
- [ ] Time ago is formatted
- [ ] Pagination works

---

## Task 5.3: Frontend - Dashboard Pages

### 5.3.1 Main Dashboard with Metric Cards

**Objective:** Build the main dashboard with metric cards.

**File Location:** `apps/web/src/app/admin/page.tsx`

**Requirements:**

- **Page Structure:**
  - Route: `/admin`
  - Layout: Admin layout with sidebar
  - Auto-refresh: Every 30 seconds
  - Loading skeletons

- **Metric Cards:**
  - **User Cards:**
    - Total Users with trend indicator
    - Active Users (last 30 days)
    - New Users Today
    - Users by Status (mini pie chart)

  - **Tenant Cards:**
    - Total Tenants
    - Active Tenants
    - New Tenants This Week
    - Average Users per Tenant

  - **Activity Cards:**
    - Active Sessions Today
    - Active Tenants Today
    - API Requests Today
    - Error Rate

  - **Growth Cards:**
    - User Growth (percentage)
    - Tenant Growth (percentage)
    - API Growth (percentage)

- **Card Components:**
  - Icon with color coding
  - Title and value
  - Trend indicator (up/down with percentage)
  - Change period label
  - Mini sparkline chart (optional)

- **Layout:**
  - Responsive grid (4 columns on large screens)
  - 2 columns on medium screens
  - 1 column on small screens
  - Card hover effects

**Verification:**
- [ ] Dashboard renders correctly
- [ ] All metrics are displayed
- [ ] Trend indicators work
- [ ] Grid layout is responsive
- [ ] Auto-refresh works
- [ ] Loading skeletons show
- [ ] Error states are handled

---

### 5.3.2 User Growth Chart (Recharts)

**Objective:** Create interactive user growth chart.

**File Location:** `apps/web/src/components/admin/charts/user-growth-chart.tsx`

**Requirements:**

- **Chart Setup:**
  - Use Recharts library
  - Responsive container
  - Loading state with skeleton

- **Chart Features:**
  - **Dual Axis**: New users (bars) and Total users (line)
  - **Tooltip**: Show detailed data on hover
  - **Legend**: New users, Total users
  - **Grid lines**: For readability
  - **Period Selector**: Day, Week, Month
  - **Export**: Download as PNG

- **Data Format:**
  ```typescript
  {
    date: string // '2024-01-01'
    newUsers: number
    totalUsers: number
    cumulative: number
    growthRate: number
  }
  ```

- **Visual Design:**
  - Primary color for bars (blue)
  - Secondary color for line (green)
  - Gradient fill for bars
  - Smooth line with curve
  - Animated on load

- **Interactivity:**
  - Hover to highlight data point
  - Click to view details
  - Zoom into date range
  - Reset zoom button

**Verification:**
- [ ] Chart renders with data
- [ ] Dual axis works
- [ ] Tooltip shows details
- [ ] Period selector works
- [ ] Export works
- [ ] Responsive design works
- [ ] Animated on load

---

### 5.3.3 Tenant Activity Chart

**Objective:** Create chart showing tenant activity.

**File Location:** `apps/web/src/components/admin/charts/tenant-activity-chart.tsx`

**Requirements:**

- **Chart Setup:**
  - Use Recharts library
  - Responsive container
  - Loading state with skeleton

- **Chart Features:**
  - **Bar Chart**: Activity by day/week
  - **Stacked Bars**: By tenant status (Active, Suspended, New)
  - **Tooltip**: Show detailed data on hover
  - **Legend**: Color-coded statuses
  - **Period Selector**: Day, Week, Month
  - **Export**: Download as PNG

- **Data Format:**
  ```typescript
  {
    date: string // '2024-01-01'
    active: number
    suspended: number
    new: number
    total: number
  }
  ```

- **Visual Design:**
  - Green for active
  - Red for suspended
  - Blue for new
  - Rounded bars
  - Animated on load

- **Interactivity:**
  - Hover to highlight bar
  - Click to view tenant list for that day
  - Show total on top of bars

**Verification:**
- [ ] Chart renders with data
- [ ] Stacked bars work
- [ ] Tooltip shows details
- [ ] Period selector works
- [ ] Export works
- [ ] Responsive design works

---

### 5.3.4 Recent Activity Feed

**Objective:** Display recent activity in a feed format.

**File Location:** `apps/web/src/components/admin/recent-activity-feed.tsx`

**Requirements:**

- **Feed Component:**
  - Show last 10-20 events
  - Auto-refresh every 30 seconds
  - "View All" link to audit logs

- **Event Items:**
  - **Icon**: Based on event type
    - 👤 User events (user icon)
    - 🏢 Tenant events (building icon)
    - 🔐 Auth events (lock icon)
    - ⚙️ System events (gear icon)
  - **Description**: Human-readable event description
  - **User**: Who performed the action
  - **Tenant**: Context (if applicable)
  - **Time**: Relative time (5 minutes ago)
  - **Details**: Expandable for more info

- **Event Types and Icons:**
  ```typescript
  const eventIcons = {
    'user.created': { icon: UserPlus, color: 'blue' },
    'user.deleted': { icon: UserMinus, color: 'red' },
    'user.suspended': { icon: UserX, color: 'orange' },
    'tenant.created': { icon: Building2, color: 'green' },
    'tenant.suspended': { icon: BuildingX, color: 'orange' },
    'auth.login': { icon: LogIn, color: 'green' },
    'auth.failed': { icon: AlertCircle, color: 'red' },
    'role.created': { icon: Shield, color: 'purple' },
  }
  ```

- **Visual Design:**
  - Timeline with vertical line
  - Avatar or icon for each event
  - Color coding by event type
  - Hover effect on events
  - "Load more" button

**Verification:**
- [ ] Activity feed renders
- [ ] Events show correct icons
- [ ] Relative time works
- [ ] Auto-refresh works
- [ ] "View All" link works
- [ ] "Load more" works
- [ ] Expandable details work

---

### 5.3.5 Quick Actions Widget

**Objective:** Provide quick access to common admin tasks.

**File Location:** `apps/web/src/components/admin/quick-actions-widget.tsx`

**Requirements:**

- **Widget Setup:**
  - Display on dashboard sidebar or top
  - Compact grid of action cards
  - Responsive layout

- **Quick Actions:**
  - **Create User**: Opens create user form
  - **Create Tenant**: Opens create tenant form
  - **View Audit Logs**: Navigate to audit logs
  - **Create Role**: Opens create role form
  - **System Settings**: Navigate to settings
  - **View Reports**: Navigate to reports

- **Action Cards:**
  - Icon (large, colored)
  - Action name
  - Short description
  - Keyboard shortcut (optional)
  - Hover effect

- **Action Configuration:**
  ```typescript
  const actions = [
    {
      id: 'create-user',
      name: 'Create User',
      description: 'Add a new user to the platform',
      icon: UserPlus,
      color: 'blue',
      href: '/admin/users/create',
      shortcut: 'Ctrl+U'
    },
    // ... more actions
  ]
  ```

- **Permissions:**
  - Show/hide actions based on user permissions
  - Disable actions user doesn't have permission for
  - Show tooltip explaining why disabled

- **Recent Actions:**
  - Show recently used actions
  - Quick redo of recent action

**Verification:**
- [ ] Quick actions render
- [ ] Actions navigate correctly
- [ ] Permissions work
- [ ] Shortcuts work (if implemented)
- [ ] Recent actions show
- [ ] Responsive design works

---

## Phase 5 Verification Checklist

Before proceeding to Phase 6, verify:

- [ ] Metrics aggregation service works
- [ ] User growth analytics are accurate
- [ ] Tenant activity metrics work
- [ ] API usage statistics are tracked
- [ ] /metrics endpoint returns data
- [ ] /growth endpoint returns data
- [ ] /activity endpoint returns data
- [ ] /recent endpoint returns data
- [ ] Dashboard renders with all cards
- [ ] User growth chart works
- [ ] Tenant activity chart works
- [ ] Recent activity feed works
- [ ] Quick actions widget works
- [ ] All tests pass
- [ ] No ESLint errors
- [ ] Build succeeds

---

## Phase 5 Completion Criteria

- [ ] Metrics Aggregation Service
- [ ] User Growth Analytics Service
- [ ] Tenant Activity Service
- [ ] API Usage Statistics Service
- [ ] GET /admin/dashboard/metrics endpoint
- [ ] GET /admin/dashboard/growth endpoint
- [ ] GET /admin/dashboard/activity endpoint
- [ ] GET /admin/dashboard/recent endpoint
- [ ] Main dashboard with metric cards
- [ ] User growth chart (Recharts)
- [ ] Tenant activity chart
- [ ] Recent activity feed
- [ ] Quick actions widget
- [ ] Caching for dashboard data
- [ ] Auto-refresh functionality

---

## Phase 5 Tips & Best Practices

1. **Caching**: Cache dashboard data to reduce database load
2. **Aggregation**: Use database aggregations for performance
3. **Time Ranges**: Support multiple time ranges for flexibility
4. **Data Freshness**: Show last updated timestamp
5. **Charts**: Use Recharts for React-friendly charts
6. **Real-time**: Consider WebSocket for live updates
7. **Performance**: Use database indexes on date fields
8. **Error Handling**: Graceful degradation on data fetch failures
9. **Accessibility**: Ensure charts are accessible
10. **Export**: Provide data export options

---

**Ready for Phase 6?** Let me know when Phase 5 is complete!