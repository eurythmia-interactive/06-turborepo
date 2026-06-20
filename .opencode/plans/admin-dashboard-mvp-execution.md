# Admin Dashboard MVP - Execution Plan

**Status:** Ready for Execution  
**Date:** January 2026  
**Estimated Time:** 12-15 hours

---

## Overview

This plan implements 5 essential features for the admin dashboard MVP. Based on codebase verification, ~40% of work is already complete. This plan focuses only on what remains.

**Features to Implement:**

1. Security hardening (helmet)
2. Maintenance mode
3. User impersonation
4. Email service (Resend)
5. User invitations

---

## Current State Summary

### Already Complete (DO NOT REBUILD)

- ✅ Bulk operations (suspend/activate/delete/role-assign)
- ✅ Query optimization (indexes, caching)
- ✅ Security basics (guards, rate limiting, CORS)
- ✅ Seed data (superadmin/admin/member users)
- ✅ Audit logging system
- ✅ Dashboard with metrics and charts
- ✅ Audit log viewer with filtering and export
- ✅ Session management (list, revoke)
- ✅ 262 API tests, 98 web tests, 27 shared tests passing

### Database Models Ready to Use

- ✅ `SystemConfig` - exists, used for IP allowlist, ready for maintenance mode
- ✅ `UserInvitation` - exists with indexes, not yet used
- ✅ `FeatureFlag` - exists, not used (deferred)

### Partial Preparation

- ✅ `maintenanceSchema` in `packages/shared/src/admin/system.schema.ts` - ready to use
- ✅ `Permissions.USER_IMPERSONATE` constant exists
- ✅ `SystemAdminModule` exists but is empty

---

## Step 1: Security Hardening (helmet)

**Time:** 15 minutes  
**Dependencies:** None

### Actions

1. **Install helmet:**

   ```bash
   pnpm add helmet --filter api
   pnpm add -D @types/helmet --filter api
   ```

   **Status:** ✅ Already installed

2. **Update `apps/api/src/main.ts`:**
   - Import helmet (line 9, after ConfigService)
   - Apply `app.use(helmet())` before cookieParser (line 19)
   - Configure CSP if needed for admin dashboard resources

3. **Verify:**
   - Security headers present in responses (X-Frame-Options, X-Content-Type-Options, etc.)
   - Admin dashboard still works

### Files to Modify

- `apps/api/src/main.ts`

---

## Step 2: Maintenance Mode

**Time:** 2-3 hours  
**Dependencies:** None

### Backend Implementation

1. **Create `apps/api/src/admin/system/maintenance.service.ts`:**

   ```typescript
   @Injectable()
   export class MaintenanceService {
     constructor(
       @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
       private readonly auditService: AuditService,
     ) {}

     private cachedStatus: { enabled: boolean; message?: string; scheduledEnd?: Date } | null =
       null;

     async enable(
       message: string,
       scheduledEnd?: Date,
       userId?: string,
       ip?: string,
       userAgent?: string,
     ) {
       await this.prisma.systemConfig.upsert({
         where: { key: 'maintenance_mode' },
         update: { value: { enabled: true, message, scheduledEnd }, updatedBy: userId },
         create: {
           key: 'maintenance_mode',
           value: { enabled: true, message, scheduledEnd },
           updatedBy: userId,
         },
       });
       this.cachedStatus = null;
       await this.auditService.log({
         userId,
         action: 'system.maintenance_on',
         details: { message, scheduledEnd },
         ip,
         userAgent,
       });
     }

     async disable(userId?: string, ip?: string, userAgent?: string) {
       await this.prisma.systemConfig.upsert({
         where: { key: 'maintenance_mode' },
         update: { value: { enabled: false }, updatedBy: userId },
         create: { key: 'maintenance_mode', value: { enabled: false }, updatedBy: userId },
       });
       this.cachedStatus = null;
       await this.auditService.log({ userId, action: 'system.maintenance_off', ip, userAgent });
     }

     async getStatus() {
       if (this.cachedStatus) return this.cachedStatus;
       const config = await this.prisma.systemConfig.findUnique({
         where: { key: 'maintenance_mode' },
       });
       const value = config?.value as any;
       this.cachedStatus = {
         enabled: value?.enabled ?? false,
         message: value?.message,
         scheduledEnd: value?.scheduledEnd,
       };
       return this.cachedStatus;
     }

     async isActive() {
       const status = await this.getStatus();
       return status.enabled;
     }
   }
   ```

2. **Create `apps/api/src/admin/system/maintenance.controller.ts`:**

   ```typescript
   @Controller('admin/system/maintenance')
   @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
   @Permissions('system:maintenance')
   export class MaintenanceController {
     constructor(private readonly maintenanceService: MaintenanceService) {}

     @Post('enable')
     async enable(
       @Body(new ZodValidationPipe(enableMaintenanceSchema)) body: EnableMaintenanceInput,
       @Request() req,
     ) {
       await this.maintenanceService.enable(
         body.message,
         body.scheduledEnd,
         req.user.userId,
         req.ip,
         req.get('user-agent'),
       );
       return { success: true };
     }

     @Post('disable')
     async disable(@Request() req) {
       await this.maintenanceService.disable(req.user.userId, req.ip, req.get('user-agent'));
       return { success: true };
     }

     @Get('status')
     async getStatus() {
       return this.maintenanceService.getStatus();
     }
   }
   ```

3. **Create `apps/api/src/admin/system/maintenance.middleware.ts`:**

   ```typescript
   @Injectable()
   export class MaintenanceMiddleware implements NestMiddleware {
     constructor(private readonly maintenanceService: MaintenanceService) {}

     use(req: Request, res: Response, next: NextFunction) {
       if (req.path === '/health' || req.path.startsWith('/admin')) {
         return next();
       }

       if (req.user?.role === 'SUPER_ADMIN') {
         return next();
       }

       this.maintenanceService
         .getStatus()
         .then((status) => {
           if (status.enabled) {
             return res.status(503).json({
               error: 'Service Unavailable',
               message: status.message || 'System is under maintenance',
               scheduledEnd: status.scheduledEnd,
             });
           }
           next();
         })
         .catch(() => next());
     }
   }
   ```

4. **Update `apps/api/src/admin/system/system-admin.module.ts`:**

   ```typescript
   @Module({
     controllers: [MaintenanceController],
     providers: [MaintenanceService],
     exports: [MaintenanceService],
   })
   export class SystemAdminModule {}
   ```

5. **Update `apps/api/src/app.module.ts`:**
   - Import `SystemAdminModule` (already imported via `AdminModule`)
   - Add `MaintenanceMiddleware` in `configure()` method:
   ```typescript
   configure(consumer: MiddlewareConsumer) {
     consumer
       .apply(MaintenanceMiddleware)
       .forRoutes('*');
     consumer
       .apply(RequestLoggerMiddleware)
       .forRoutes('*');
   }
   ```

### Frontend Implementation

6. **Create `apps/web/src/components/admin/maintenance-toggle.tsx`:**
   - Button to enable/disable maintenance mode
   - Dialog to set message and scheduled end time
   - Show current status
   - Only visible to SUPER_ADMIN

7. **Create `apps/web/src/app/maintenance/page.tsx`:**
   - Public page shown when maintenance is active
   - Display maintenance message
   - Show scheduled end time if set

8. **Add to admin dashboard:**
   - Add maintenance toggle to quick actions widget or system settings

### Shared Schemas

9. **Update `packages/shared/src/admin/system.schema.ts`:**
   - Add `enableMaintenanceSchema`:

   ```typescript
   export const enableMaintenanceSchema = z.object({
     message: z.string().max(500).optional(),
     scheduledEnd: z.string().datetime().optional(),
   });
   export type EnableMaintenanceInput = z.infer<typeof enableMaintenanceSchema>;
   ```

10. **Update `packages/shared/src/index.ts`:**
    - Export `enableMaintenanceSchema` and `EnableMaintenanceInput`

### Files to Create

- `apps/api/src/admin/system/maintenance.service.ts`
- `apps/api/src/admin/system/maintenance.controller.ts`
- `apps/api/src/admin/system/maintenance.middleware.ts`
- `apps/web/src/components/admin/maintenance-toggle.tsx`
- `apps/web/src/app/maintenance/page.tsx`

### Files to Modify

- `apps/api/src/admin/system/system-admin.module.ts` (replace empty module)
- `apps/api/src/app.module.ts` (add MaintenanceMiddleware)
- `packages/shared/src/admin/system.schema.ts` (add enableMaintenanceSchema)
- `packages/shared/src/index.ts` (export new schema)

---

## Step 3: User Impersonation

**Time:** 3-4 hours  
**Dependencies:** None

### Backend Implementation

1. **Update `packages/shared/src/admin/permissions.ts`:**
   - Add `Permissions.USER_IMPERSONATE` to ADMIN role array (after `USER_RESET_PASSWORD`)

2. **Update `apps/api/src/auth/interfaces/token-payload.interface.ts`:**
   - Add `impersonatedBy?: string` to `AccessTokenPayload`
   - Add `impersonatedBy?: string` and `isImpersonating?: boolean` to `AuthenticatedUser`

3. **Update `apps/api/src/auth/utilities/token-payload.factory.ts`:**
   - Add optional `impersonatedBy` parameter to `signAccessToken()`:

   ```typescript
   async signAccessToken(
     userId: string,
     tenantId: string,
     role: Role,
     status: UserStatus,
     customRoleId?: string,
     impersonatedBy?: string,
   ): Promise<string> {
     const payload = {
       sub: userId,
       tenantId,
       role,
       status,
       ...(customRoleId && { customRoleId }),
       ...(impersonatedBy && { impersonatedBy, isImpersonation: true }),
     };
     // ... rest of implementation
   }
   ```

4. **Update `apps/api/src/auth/guards/jwt-auth.guard.ts`:**
   - Check for `isImpersonation` flag in token payload
   - If impersonating, set `req.user.impersonatedBy` and `req.user.isImpersonating`

5. **Create `apps/api/src/admin/impersonation/impersonation.service.ts`:**

   ```typescript
   @Injectable()
   export class ImpersonationService {
     private activeImpersonations = new Map<string, { targetUserId: string; expiresAt: Date }>();

     constructor(
       @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
       private readonly tokenPayloadFactory: TokenPayloadFactory,
       private readonly auditService: AuditService,
     ) {}

     async startImpersonation(
       adminUserId: string,
       targetUserId: string,
       reason: string,
       ip?: string,
       userAgent?: string,
     ) {
       const targetUser = await this.prisma.user.findUnique({
         where: { id: targetUserId },
         include: { tenants: true },
       });
       if (!targetUser) throw new NotFoundException('User not found');
       if (targetUser.role === 'SUPER_ADMIN')
         throw new ForbiddenException('Cannot impersonate SUPER_ADMIN');
       if (adminUserId === targetUserId) throw new BadRequestException('Cannot impersonate self');
       if (this.activeImpersonations.has(adminUserId))
         throw new BadRequestException('Already impersonating');

       const userTenant = targetUser.tenants[0];
       const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

       const accessToken = await this.tokenPayloadFactory.signAccessToken(
         targetUserId,
         userTenant?.tenantId || '',
         targetUser.role,
         targetUser.status,
         undefined,
         adminUserId,
       );

       this.activeImpersonations.set(adminUserId, { targetUserId, expiresAt });
       await this.auditService.log({
         userId: adminUserId,
         action: 'user.impersonation_started',
         details: { targetUserId, reason },
         ip,
         userAgent,
       });

       return { accessToken, expiresAt };
     }

     async stopImpersonation(adminUserId: string, ip?: string, userAgent?: string) {
       this.activeImpersonations.delete(adminUserId);
       await this.auditService.log({
         userId: adminUserId,
         action: 'user.impersonation_stopped',
         ip,
         userAgent,
       });
       return { success: true };
     }

     async getStatus(adminUserId: string) {
       const impersonation = this.activeImpersonations.get(adminUserId);
       if (!impersonation) return { isImpersonating: false };

       const targetUser = await this.prisma.user.findUnique({
         where: { id: impersonation.targetUserId },
       });
       return {
         isImpersonating: true,
         targetUser: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
         expiresAt: impersonation.expiresAt,
       };
     }
   }
   ```

6. **Create `apps/api/src/admin/impersonation/impersonation.controller.ts`:**

   ```typescript
   @Controller('admin/impersonation')
   @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
   @Permissions('user:impersonate')
   export class ImpersonationController {
     constructor(private readonly impersonationService: ImpersonationService) {}

     @Post('start')
     async start(@Body() body: { userId: string; reason: string }, @Request() req) {
       return this.impersonationService.startImpersonation(
         req.user.userId,
         body.userId,
         body.reason,
         req.ip,
         req.get('user-agent'),
       );
     }

     @Post('stop')
     async stop(@Request() req) {
       return this.impersonationService.stopImpersonation(
         req.user.userId,
         req.ip,
         req.get('user-agent'),
       );
     }

     @Get('status')
     async getStatus(@Request() req) {
       return this.impersonationService.getStatus(req.user.userId);
     }
   }
   ```

7. **Create `apps/api/src/admin/impersonation/impersonation.module.ts`:**

   ```typescript
   @Module({
     imports: [forwardRef(() => AuthModule), forwardRef(() => AdminModule)],
     controllers: [ImpersonationController],
     providers: [ImpersonationService],
     exports: [ImpersonationService],
   })
   export class ImpersonationModule {}
   ```

8. **Update `apps/api/src/admin/admin.module.ts`:**
   - Import `ImpersonationModule`

### Frontend Implementation

9. **Create `apps/web/src/actions/impersonation.ts`:**

   ```typescript
   'use server';

   export async function startImpersonationAction(userId: string, reason: string) {
     const response = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/impersonation/start`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', Cookie: await getCookieHeader() },
         body: JSON.stringify({ userId, reason }),
       },
     );
     if (!response.ok) throw new Error('Failed to start impersonation');
     const data = await response.json();
     setCookie('access_token', data.accessToken, { expires: new Date(data.expiresAt) });
     return data;
   }

   export async function stopImpersonationAction() {
     const response = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/impersonation/stop`,
       {
         method: 'POST',
         headers: { Cookie: await getCookieHeader() },
       },
     );
     if (!response.ok) throw new Error('Failed to stop impersonation');
     return response.json();
   }

   export async function getImpersonationStatusAction() {
     const response = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/impersonation/status`,
       {
         headers: { Cookie: await getCookieHeader() },
       },
     );
     if (!response.ok) return { isImpersonating: false };
     return response.json();
   }
   ```

10. **Create `apps/web/src/components/admin/impersonation-banner.tsx`:**
    - Show at top of page when impersonating
    - Display: "Impersonating [user name] - [expires in X minutes]"
    - "Stop Impersonation" button
    - Red/orange background
    - Check status on mount, auto-redirect when stopped

11. **Create `apps/web/src/components/admin/impersonate-button.tsx`:**
    - Add to user actions dropdown
    - Only show if user has `user:impersonate` permission
    - Only show for non-SUPER_ADMIN users
    - Open confirmation dialog with reason input
    - Call start impersonation endpoint
    - Redirect to /dashboard

12. **Update `apps/web/src/components/admin/user-actions.tsx`:**
    - Add 'impersonate' to `actionType` union
    - Add case in switch statements for impersonate
    - Import and use `startImpersonationAction`

13. **Update `apps/web/src/components/layout/dashboard-layout.tsx`:**
    - Add `<ImpersonationBanner />` above `{children}`

14. **Update `apps/web/src/app/admin/layout.tsx`:**
    - Add `<ImpersonationBanner />` above `<AdminLayout>`

### Files to Create

- `apps/api/src/admin/impersonation/impersonation.service.ts`
- `apps/api/src/admin/impersonation/impersonation.controller.ts`
- `apps/api/src/admin/impersonation/impersonation.module.ts`
- `apps/web/src/actions/impersonation.ts`
- `apps/web/src/components/admin/impersonate-button.tsx`
- `apps/web/src/components/admin/impersonation-banner.tsx`

### Files to Modify

- `packages/shared/src/admin/permissions.ts` (add USER_IMPERSONATE to ADMIN)
- `apps/api/src/auth/interfaces/token-payload.interface.ts` (add impersonatedBy fields)
- `apps/api/src/auth/utilities/token-payload.factory.ts` (add impersonatedBy param)
- `apps/api/src/auth/guards/jwt-auth.guard.ts` (handle impersonation tokens)
- `apps/api/src/admin/admin.module.ts` (import ImpersonationModule)
- `apps/web/src/components/admin/user-actions.tsx` (add impersonate option)
- `apps/web/src/components/layout/dashboard-layout.tsx` (add banner)
- `apps/web/src/app/admin/layout.tsx` (add banner)

---

## Step 4: Email Service (Resend)

**Time:** 1 hour  
**Dependencies:** None

### Actions

1. **Install Resend:**

   ```bash
   pnpm add resend --filter api
   ```

2. **Update `apps/api/src/config/env.validation.ts`:**

   ```typescript
   RESEND_API_KEY: z.string().optional(),
   EMAIL_FROM: z.string().email().default('noreply@example.com'),
   ```

3. **Update `.env.example`:**

   ```env
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@example.com
   ```

4. **Create `apps/api/src/common/email/email.service.ts`:**

   ```typescript
   @Injectable()
   export class EmailService {
     private readonly resend: Resend | null = null;
     private readonly fromEmail: string;

     constructor(private readonly configService: ConfigService) {
       const apiKey = this.configService.get<string>('RESEND_API_KEY');
       this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');

       if (apiKey) {
         this.resend = new Resend(apiKey);
       } else {
         console.warn('[EmailService] RESEND_API_KEY not set - emails will be logged to console');
       }
     }

     async send(to: string, subject: string, html: string): Promise<boolean> {
       if (!this.resend) {
         console.log(`[Email] To: ${to}, Subject: ${subject}`);
         console.log(`[Email] Body: ${html}`);
         return true;
       }

       try {
         await this.resend.emails.send({ from: this.fromEmail, to, subject, html });
         return true;
       } catch (error) {
         console.error('[EmailService] Failed to send email:', error);
         return false;
       }
     }

     async sendInvitation(
       to: string,
       invitationLink: string,
       tenantName: string,
       inviterName: string,
     ) {
       const html = invitationTemplate({ invitationLink, tenantName, inviterName });
       return this.send(to, `You're invited to join ${tenantName}`, html);
     }

     async sendWelcome(to: string, userName: string) {
       const html = welcomeTemplate({ userName });
       return this.send(to, 'Welcome!', html);
     }
   }
   ```

5. **Create `apps/api/src/common/email/email.module.ts`:**

   ```typescript
   @Global()
   @Module({
     providers: [EmailService],
     exports: [EmailService],
   })
   export class EmailModule {}
   ```

6. **Create email templates:**
   - `apps/api/src/common/email/templates/invitation.tsx`
   - `apps/api/src/common/email/templates/welcome.tsx`
   - Use simple HTML with inline styles

7. **Update `apps/api/src/app.module.ts`:**
   - Import `EmailModule`

### Files to Create

- `apps/api/src/common/email/email.service.ts`
- `apps/api/src/common/email/email.module.ts`
- `apps/api/src/common/email/templates/invitation.tsx`
- `apps/api/src/common/email/templates/welcome.tsx`

### Files to Modify

- `apps/api/src/config/env.validation.ts` (add RESEND_API_KEY, EMAIL_FROM)
- `apps/api/src/app.module.ts` (import EmailModule)
- `.env.example` (add RESEND_API_KEY, EMAIL_FROM)

---

## Step 5: User Invitations

**Time:** 3-4 hours  
**Dependencies:** Step 4 (Email Service)

### Backend Implementation

1. **Create `packages/shared/src/admin/invitation.schema.ts`:**

   ```typescript
   export const createInvitationSchema = z.object({
     email: z.string().email(),
     tenantId: z.string().optional(),
     role: z.enum(['ADMIN', 'MEMBER', 'GUEST']).default('MEMBER'),
   });
   export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

   export const invitationResponseSchema = z.object({
     id: z.string(),
     email: z.string(),
     tenantId: z.string().nullable(),
     role: z.string(),
     status: z.enum(['pending', 'accepted', 'expired', 'canceled']),
     createdAt: z.string().datetime(),
     expiresAt: z.string().datetime(),
     acceptedAt: z.string().datetime().nullable(),
   });
   export type InvitationResponse = z.infer<typeof invitationResponseSchema>;

   export const invitationListQuerySchema = z.object({
     tenantId: z.string().optional(),
     status: z.enum(['pending', 'accepted', 'expired', 'canceled']).optional(),
   });
   export type InvitationListQuery = z.infer<typeof invitationListQuerySchema>;
   ```

2. **Update `packages/shared/src/index.ts`:**
   - Export invitation schemas and types

3. **Create `apps/api/src/admin/invitation/invitation.service.ts`:**

   ```typescript
   @Injectable()
   export class InvitationService {
     constructor(
       @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
       private readonly emailService: EmailService,
       private readonly auditService: AuditService,
     ) {}

     async createInvitation(
       email: string,
       tenantId: string | undefined,
       role: Role,
       invitedBy: string,
       ip?: string,
       userAgent?: string,
     ) {
       const existingUser = await this.prisma.user.findUnique({ where: { email } });
       if (existingUser) throw new ConflictException('User already exists');

       const existingInvitation = await this.prisma.userInvitation.findFirst({
         where: { email, status: 'pending', expiresAt: { gt: new Date() } },
       });
       if (existingInvitation) throw new ConflictException('Invitation already pending');

       const token = randomBytes(32).toString('hex');
       const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

       const invitation = await this.prisma.userInvitation.create({
         data: { email, token, tenantId, role, invitedBy, expiresAt },
       });

       const invitationLink = `${process.env.WEB_URL || 'http://localhost:3000'}/invite/${token}`;
       await this.emailService.sendInvitation(
         email,
         invitationLink,
         tenantId || 'our platform',
         '',
       );

       await this.auditService.log({
         userId: invitedBy,
         action: 'invitation.created',
         details: { email, tenantId, role },
         ip,
         userAgent,
       });

       return invitation;
     }

     async acceptInvitation(token: string, userId: string) {
       const invitation = await this.prisma.userInvitation.findUnique({ where: { token } });
       if (!invitation) throw new NotFoundException('Invitation not found');
       if (invitation.acceptedAt) throw new ConflictException('Invitation already accepted');
       if (invitation.expiresAt < new Date()) throw new ConflictException('Invitation expired');

       await this.prisma.$transaction([
         this.prisma.userInvitation.update({
           where: { id: invitation.id },
           data: { acceptedAt: new Date() },
         }),
         this.prisma.userTenant.create({
           data: { userId, tenantId: invitation.tenantId!, role: invitation.role },
         }),
       ]);

       await this.auditService.log({
         userId,
         action: 'invitation.accepted',
         details: { invitationId: invitation.id },
       });

       return { success: true };
     }

     async getInvitations(tenantId?: string, status?: string) {
       const where: any = {};
       if (tenantId) where.tenantId = tenantId;
       if (status) {
         if (status === 'expired') {
           where.expiresAt = { lt: new Date() };
           where.acceptedAt = null;
         } else if (status === 'pending') {
           where.expiresAt = { gt: new Date() };
           where.acceptedAt = null;
         } else {
           where.acceptedAt = { not: null };
         }
       }

       return this.prisma.userInvitation.findMany({
         where,
         include: { tenant: true, invitedByUser: true },
         orderBy: { createdAt: 'desc' },
       });
     }

     async resendInvitation(invitationId: string, userId: string, ip?: string, userAgent?: string) {
       const invitation = await this.prisma.userInvitation.findUnique({
         where: { id: invitationId },
       });
       if (!invitation) throw new NotFoundException('Invitation not found');
       if (invitation.acceptedAt) throw new ConflictException('Invitation already accepted');

       const invitationLink = `${process.env.WEB_URL || 'http://localhost:3000'}/invite/${invitation.token}`;
       await this.emailService.sendInvitation(
         invitation.email,
         invitationLink,
         invitation.tenantId || 'our platform',
         '',
       );

       await this.auditService.log({
         userId,
         action: 'invitation.resend',
         details: { invitationId },
         ip,
         userAgent,
       });

       return { success: true };
     }

     async cancelInvitation(invitationId: string, userId: string, ip?: string, userAgent?: string) {
       await this.prisma.userInvitation.update({
         where: { id: invitationId },
         data: { expiresAt: new Date() },
       });

       await this.auditService.log({
         userId,
         action: 'invitation.canceled',
         details: { invitationId },
         ip,
         userAgent,
       });

       return { success: true };
     }
   }
   ```

4. **Create `apps/api/src/admin/invitation/invitation.controller.ts`:**

   ```typescript
   @Controller('admin/invitations')
   @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
   export class InvitationController {
     constructor(private readonly invitationService: InvitationService) {}

     @Post()
     @Permissions('user:write')
     async create(
       @Body(new ZodValidationPipe(createInvitationSchema)) body: CreateInvitationInput,
       @Request() req,
     ) {
       return this.invitationService.createInvitation(
         body.email,
         body.tenantId,
         body.role,
         req.user.userId,
         req.ip,
         req.get('user-agent'),
       );
     }

     @Get()
     @Permissions('user:read')
     async list(
       @Query(new ZodValidationPipe(invitationListQuerySchema)) query: InvitationListQuery,
     ) {
       return this.invitationService.getInvitations(query.tenantId, query.status);
     }

     @Post(':id/resend')
     @Permissions('user:write')
     async resend(@Param('id') id: string, @Request() req) {
       return this.invitationService.resendInvitation(
         id,
         req.user.userId,
         req.ip,
         req.get('user-agent'),
       );
     }

     @Delete(':id')
     @Permissions('user:write')
     async cancel(@Param('id') id: string, @Request() req) {
       return this.invitationService.cancelInvitation(
         id,
         req.user.userId,
         req.ip,
         req.get('user-agent'),
       );
     }
   }
   ```

5. **Create `apps/api/src/admin/invitation/invitation.module.ts`:**

   ```typescript
   @Module({
     imports: [forwardRef(() => AdminModule), EmailModule],
     controllers: [InvitationController],
     providers: [InvitationService],
     exports: [InvitationService],
   })
   export class InvitationModule {}
   ```

6. **Create public invitation controller `apps/api/src/invitation/invitation.controller.ts`:**

   ```typescript
   @Controller('invitations')
   export class PublicInvitationController {
     constructor(private readonly invitationService: InvitationService) {}

     @Get(':token')
     @Public()
     async getInvitation(@Param('token') token: string) {
       const invitation = await this.invitationService.getInvitationByToken(token);
       return {
         email: invitation.email,
         tenantName: invitation.tenant?.name,
         role: invitation.role,
         expiresAt: invitation.expiresAt,
       };
     }

     @Post(':token/accept')
     async accept(@Param('token') token: string, @Request() req) {
       return this.invitationService.acceptInvitation(token, req.user.userId);
     }
   }
   ```

7. **Create `apps/api/src/invitation/invitation.module.ts`:**

   ```typescript
   @Module({
     imports: [forwardRef(() => AdminModule)],
     controllers: [PublicInvitationController],
   })
   export class PublicInvitationModule {}
   ```

8. **Update `apps/api/src/admin/admin.module.ts`:**
   - Import `InvitationModule`

9. **Update `apps/api/src/app.module.ts`:**
   - Import `PublicInvitationModule`

### Frontend Implementation

10. **Create `apps/web/src/actions/invitations.ts`:**

    ```typescript
    'use server';

    export async function createInvitationAction(
      email: string,
      tenantId: string | undefined,
      role: string,
    ) {
      // ... API call
    }

    export async function getInvitationsAction(tenantId?: string, status?: string) {
      // ... API call
    }

    export async function resendInvitationAction(id: string) {
      // ... API call
    }

    export async function cancelInvitationAction(id: string) {
      // ... API call
    }
    ```

11. **Create `apps/web/src/components/admin/invitation-dialog.tsx`:**
    - Form fields: email, tenant (dropdown), role (dropdown)
    - Validation with react-hook-form + zod
    - Submit calls createInvitationAction
    - Show success/error toast

12. **Create `apps/web/src/components/admin/invitation-list.tsx`:**
    - Table showing: email, tenant, role, status, created, actions
    - Status badges: Pending (yellow), Accepted (green), Expired (gray), Canceled (red)
    - Actions: Resend (for pending), Cancel (for pending)
    - Filter by status
    - Pagination

13. **Create `apps/web/src/app/admin/invitations/page.tsx`:**
    - Page header with "Invite User" button
    - InvitationList component
    - InvitationDialog (opened by button)

14. **Create `apps/web/src/app/invite/[token]/page.tsx`:**
    - Fetch invitation details by token
    - Show: "You've been invited to join [tenant name] as [role]"
    - If logged in: "Accept Invitation" button
    - If not logged in: "Sign up to accept" with link to /register?invitation=[token]

15. **Update `apps/web/src/components/admin/admin-layout.tsx`:**
    - Add "Invitations" to `adminMenuItems` array:

    ```typescript
    { title: 'Invitations', href: '/admin/invitations', icon: Mail }
    ```
    - Import `Mail` from `lucide-react`

16. **Update `apps/web/src/app/register/page.tsx`:**
    - Check for `invitation` query param
    - If present, pre-fill email and tenant
    - After registration, auto-accept invitation

### Files to Create

- `apps/api/src/admin/invitation/invitation.service.ts`
- `apps/api/src/admin/invitation/invitation.controller.ts`
- `apps/api/src/admin/invitation/invitation.module.ts`
- `apps/api/src/invitation/invitation.controller.ts` (public)
- `apps/api/src/invitation/invitation.module.ts` (public)
- `apps/web/src/actions/invitations.ts`
- `apps/web/src/components/admin/invitation-dialog.tsx`
- `apps/web/src/components/admin/invitation-list.tsx`
- `apps/web/src/app/admin/invitations/page.tsx`
- `apps/web/src/app/invite/[token]/page.tsx`
- `packages/shared/src/admin/invitation.schema.ts`

### Files to Modify

- `packages/shared/src/index.ts` (export invitation schemas)
- `apps/api/src/admin/admin.module.ts` (import InvitationModule)
- `apps/api/src/app.module.ts` (import PublicInvitationModule)
- `apps/web/src/components/admin/admin-layout.tsx` (add Invitations link)
- `apps/web/src/app/register/page.tsx` (handle invitation param)

---

## Step 6: Testing

**Time:** 2 hours

### Tests to Write

1. **`apps/api/src/admin/system/maintenance.service.spec.ts`:**
   - Enable maintenance mode
   - Disable maintenance mode
   - Get status
   - Audit logging

2. **`apps/api/src/admin/impersonation/impersonation.service.spec.ts`:**
   - Start impersonation
   - Stop impersonation
   - Token generation
   - Cannot impersonate SUPER_ADMIN
   - Cannot impersonate self
   - Expiry handling

3. **`apps/api/src/admin/invitation/invitation.service.spec.ts`:**
   - Create invitation
   - Accept invitation
   - Resend invitation
   - Cancel invitation
   - Duplicate prevention
   - Expiry handling
   - Email sending

---

## Execution Order

1. **Security hardening** (quick win, no dependencies)
2. **Maintenance mode** (uses existing SystemConfig, no dependencies)
3. **User impersonation** (independent, can be done anytime)
4. **Email service** (prerequisite for invitations)
5. **User invitations** (depends on email service)
6. **Testing** (after all features are built)

---

## Verification Checklist

### Security Hardening

- [ ] Helmet installed
- [ ] Security headers present in responses
- [ ] Admin dashboard still works

### Maintenance Mode

- [ ] Maintenance can be enabled/disabled
- [ ] Non-admin users get 503 when maintenance is active
- [ ] Admin users can still access /admin
- [ ] /health endpoint still works
- [ ] Maintenance page shows message
- [ ] Audit logs capture maintenance events
- [ ] Status endpoint returns correct state

### User Impersonation

- [ ] Admin can start impersonation
- [ ] Token is generated with correct claims
- [ ] Admin can access app as target user
- [ ] Banner shows when impersonating
- [ ] Admin can stop impersonation
- [ ] Token expires after 1 hour
- [ ] Cannot impersonate SUPER_ADMIN
- [ ] Cannot impersonate self
- [ ] Audit logs capture impersonation events
- [ ] Permission check works

### Email Service

- [ ] Resend installed
- [ ] EmailService can send test email
- [ ] Templates render correctly
- [ ] Email failures are logged but don't crash
- [ ] Works in dev mode without API key

### User Invitations

- [ ] Admin can create invitation
- [ ] Invitation email is sent
- [ ] Invitation appears in list
- [ ] Invitee can view invitation details
- [ ] Invitee can accept invitation (logged in)
- [ ] Invitee can accept invitation (new user)
- [ ] UserTenant record is created
- [ ] Invitation status updates
- [ ] Admin can resend/cancel invitations
- [ ] Expired invitations cannot be accepted
- [ ] Duplicate invitations are prevented
- [ ] Audit logs capture invitation events

### Testing

- [ ] All new tests pass
- [ ] Existing tests still pass
- [ ] Test coverage > 70% for new services

---

## Key Implementation Notes

### Backend Patterns

- Controllers use guards: `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)`
- Permissions via decorator: `@Permissions('permission:name')`
- Validation via pipe: `@Body(new ZodValidationPipe(schema))`
- Services inject Prisma: `@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient`
- Audit logging: `this.auditService.log({ userId, action, details, ip, userAgent })`
- All imports use `.js` extension (ESM convention)

### Frontend Patterns

- Server actions in `apps/web/src/actions/*.ts`
- Components use TanStack Table for data grids
- UI components from shadcn/ui (Radix UI primitives)
- Toast notifications via sonner
- Forms with react-hook-form + zod

### Database Patterns

- Models in `packages/database/prisma/schema.prisma`
- Migrations via `npx prisma migrate dev`
- Client generated to `packages/database/src/generated/prisma`

### Shared Package Patterns

- Zod schemas in `packages/shared/src/admin/*.schema.ts`
- Export from `packages/shared/src/index.ts`
- Build: `pnpm --filter shared build`

---

## Ready to Execute

All file paths verified. All dependencies clear. All patterns documented.

**Run after each major feature:**

```bash
pnpm test
pnpm build
```
