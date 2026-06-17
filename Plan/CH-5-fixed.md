# CH-05 Development Plan: Stateless Authentication & Security Layers

## Current State Analysis

The codebase has a scaffolded auth module but **zero implementation**. Critical gaps:

1. **No auth dependencies installed** (`@nestjs/jwt`, `bcrypt`/`argon2`, `cookie-parser`, etc.)
2. **Prisma schema out of sync** — generated client expects `AuthenticationProvider`, `RefreshToken`, enums (`Role`, `UserStatus`, `AuthProviderType`), but `schema.prisma` only has basic `User`
3. **Auth controller/service are empty shells**
4. **No guards, decorators, or JWT logic**
5. **Environment validation expects `JWT_SECRET`** but no JWT infrastructure exists

---

## Implementation Plan

### Phase 0: Prerequisites & Foundation

**0.1 Sync Prisma Schema**

- Update `packages/database/prisma/schema.prisma` to match generated client:
  - Add enums: `AuthProviderType`, `UserStatus`, `Role`
  - Extend `User` model: add `image`, `status`, `role` fields
  - Add `AuthenticationProvider` model (id, userId, type, providerUserId, passwordHash, timestamps)
  - Add `RefreshToken` model (id, userId, tokenHash, familyId, replacedById, revoked, expiresAt, timestamps)
- Run `pnpm --filter @repo/database db:migrate` to create migration
- Verify generated types export correctly

**0.2 Install Dependencies**

```bash
pnpm --filter @apps/api add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt cookie-parser
pnpm --filter @apps/api add -D @types/passport-jwt @types/bcrypt @types/cookie-parser
```

**0.3 Update Environment Configuration**

- Extend `env.validation.ts` Zod schema:
  - `JWT_PRIVATE_KEY` (optional, for RS256 production)
  - `JWT_PUBLIC_KEY` (optional, for RS256 production)
  - `JWT_EXPIRES_IN_ACCESS` (default: `'15m'`)
  - `JWT_EXPIRES_IN_REFRESH` (default: `'7d'`)
  - `JWT_ISSUER` (default: `'turborepo-api'`)
  - `JWT_AUDIENCE` (default: `'turborepo-client'`)
  - `COOKIE_SECURE` (boolean, default: `false` for dev)
- Update `.env.example` with all required variables

---

### Phase 1: Task 5.1 — Token Signing & Encryption

**1.1 Cryptographic Key Pair Configuration**

- Create `apps/api/src/auth/config/jwt.config.ts`:
  - Async factory reading env vars
  - Production: RS256 with private/public key pair (base64-encoded env vars or file paths)
  - Development/Test: HMAC-SHA256 fallback with `JWT_SECRET`
  - Export `JwtConfig` interface with `secret`, `publicKey`, `privateKey`, `signOptions`, `verifyOptions`

**1.2 NestJS JWT Module Configuration**

- Update `apps/api/src/auth/auth.module.ts`:
  - Import `JwtModule.registerAsync()` with dynamic config
  - Configure two token profiles:
    - Access token: 15min expiry, includes `sub`, `iss`, `aud`, `iat`, `exp`, `role`, `tenantId` (if multi-tenant)
    - Refresh token: 7d expiry, includes `sub`, `sessionId` (UUID), `familyId` (UUID)

**1.3 Token Payload Architecture**

- Create `apps/api/src/auth/interfaces/token-payload.interface.ts`:

  ```typescript
  interface AccessTokenPayload {
    sub: string; // User ID
    email?: string; // Optional, omit for privacy
    role: Role;
    status: UserStatus;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
  }

  interface RefreshTokenPayload {
    sub: string;
    sessionId: string; // Unique per token
    familyId: string; // Groups rotated tokens
    iat: number;
    exp: number;
  }
  ```

- Create `apps/api/src/auth/utilities/token-payload.factory.ts`:
  - `buildAccessTokenPayload(user, config)` — excludes sensitive fields
  - `buildRefreshTokenPayload(userId, sessionId, familyId)`

**Testing 1.1–1.3:**

- Unit tests for `jwt.config.ts`: verify RS256 vs HMAC fallback logic
- Unit tests for payload factories: ensure no sensitive data leaks
- Integration test: sign + verify token round-trip with both algorithms

---

### Phase 2: Task 5.2 — Secure Cookie Transmission

**2.1 Express v5 Cookie Parser Integration**

- Update `apps/api/src/main.ts`:
  ```typescript
  import * as cookieParser from 'cookie-parser';
  // After NestFactory.create, before enableCors:
  app.use(cookieParser());
  ```

**2.2 Strict Refresh Cookie Properties**

- Create `apps/api/src/auth/utilities/cookie.utility.ts`:

  ```typescript
  export function setRefreshTokenCookie(
    response: Response,
    token: string,
    config: { secure: boolean; maxAge: number },
  ) {
    response.cookie('refreshToken', token, {
      httpOnly: true,
      secure: config.secure,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: config.maxAge,
    });
  }

  export function clearRefreshTokenCookie(response: Response) {
    response.cookie('refreshToken', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      expires: new Date(0),
    });
  }
  ```

**2.3 CORS Configuration**

- Update `apps/api/src/main.ts` (already partially done):
  ```typescript
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = configService.get<string>('CORS_ORIGINS')?.split(',') || [];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });
  ```

**Testing 2.1–2.3:**

- E2E test: verify `cookie-parser` middleware parses cookies correctly
- Unit test: `setRefreshTokenCookie` sets correct attributes (mock response object)
- E2E test: CORS rejects requests from unlisted origins with `credentials: true`
- E2E test: refresh token cookie is sent only to `/api/v1/auth/refresh` path

---

### Phase 3: Task 5.3 — Stateless Route Guards

**3.1 Custom Access Token Guard**

- Create `apps/api/src/auth/guards/jwt-auth.guard.ts`:

  ```typescript
  @Injectable()
  export class JwtAuthGuard implements CanActivate {
    constructor(
      private jwtService: JwtService,
      private configService: ConfigService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const token = this.extractTokenFromHeader(request);
      if (!token) throw new UnauthorizedException('Missing access token');

      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_PUBLIC_KEY') || this.configService.get('JWT_SECRET'),
          algorithms: ['RS256', 'HS256'],
        });
        request.user = payload;
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
      const [type, token] = request.headers.authorization?.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
    }
  }
  ```

**3.2 Token Integrity Verification**

- Enhance `JwtAuthGuard` to validate:
  - `iss` matches expected issuer
  - `aud` matches expected audience
  - Token not expired (handled by `jwtService.verify`)
  - Signature valid (handled by `jwtService.verify`)

**3.3 Execution Context Enrichment**

- `JwtAuthGuard` already binds `request.user = payload` (done in 3.1)
- Create `apps/api/src/auth/interfaces/authenticated-user.interface.ts`:
  ```typescript
  interface AuthenticatedUser {
    userId: string;
    role: Role;
    status: UserStatus;
  }
  ```

**3.4 Route Decorators**

- Create `apps/api/src/common/decorators/current-user.decorator.ts`:

  ```typescript
  export const CurrentUser = createParamDecorator(
    (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      return data ? request.user?.[data] : request.user;
    },
  );
  ```

- Create `apps/api/src/common/decorators/public.decorator.ts`:

  ```typescript
  export const IS_PUBLIC_KEY = 'isPublic';
  export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
  ```

- Update `JwtAuthGuard` to check `IS_PUBLIC_KEY` metadata and bypass if true.

- Register `JwtAuthGuard` globally in `app.module.ts`:
  ```typescript
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }];
  ```

**Testing 3.1–3.4:**

- Unit test: `JwtAuthGuard` rejects requests without `Authorization` header
- Unit test: `JwtAuthGuard` rejects expired/malformed tokens
- Unit test: `JwtAuthGuard` enriches `request.user` with payload
- Unit test: `@Public()` decorator bypasses guard
- Unit test: `@CurrentUser()` extracts user from request
- E2E test: protected route returns 401 without token, 200 with valid token

---

### Phase 4: Task 5.4 — Role-Based Authorization Guards (RBAC)

**4.1 Roles Metadata Decorator**

- Create `apps/api/src/auth/decorators/roles.decorator.ts`:
  ```typescript
  export const ROLES_KEY = 'roles';
  export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
  ```

**4.2 Hierarchical RBAC Guard**

- Create `apps/api/src/auth/guards/roles.guard.ts`:

  ```typescript
  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!requiredRoles) return true;

      const { user } = context.switchToHttp().getRequest();
      const hasRole = requiredRoles.some((role) => user.role === role);
      if (!hasRole) throw new ForbiddenException('Insufficient role');
      return true;
    }
  }
  ```

- Register `RolesGuard` globally in `app.module.ts` (after `JwtAuthGuard`).

**4.3 Action-Based Permission Scopes**

- Create `apps/api/src/auth/decorators/permissions.decorator.ts`:

  ```typescript
  export const PERMISSIONS_KEY = 'permissions';
  export const Permissions = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);
  ```

- Create `apps/api/src/auth/guards/permissions.guard.ts`:

  ```typescript
  @Injectable()
  export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!requiredPermissions) return true;

      const { user } = context.switchToHttp().getRequest();
      const userPermissions = this.getPermissionsForRole(user.role);
      const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));
      if (!hasPermission) throw new ForbiddenException('Insufficient permissions');
      return true;
    }

    private getPermissionsForRole(role: Role): string[] {
      const rolePermissions: Record<Role, string[]> = {
        ADMIN: ['user:read', 'user:write', 'user:delete', 'billing:read', 'billing:write'],
        MEMBER: ['user:read', 'user:write'],
        GUEST: ['user:read'],
      };
      return rolePermissions[role] || [];
    }
  }
  ```

- Register `PermissionsGuard` globally (after `RolesGuard`).

**Testing 4.1–4.3:**

- Unit test: `@Roles()` decorator attaches metadata
- Unit test: `RolesGuard` allows access when user has required role
- Unit test: `RolesGuard` throws `ForbiddenException` when user lacks role
- Unit test: `@Permissions()` decorator attaches metadata
- Unit test: `PermissionsGuard` evaluates fine-grained permissions correctly
- E2E test: admin-only route rejects MEMBER role with 403
- E2E test: permission-protected route rejects user without specific permission

---

### Phase 5: Task 5.5 — Session Revocation & Token Rotation

**5.1 Token Rotation Exchange Pipeline**

- Implement `AuthService.refreshTokens(refreshToken: string)`:
  - Hash incoming token with bcrypt
  - Query `RefreshToken` table by `tokenHash`
  - Validate: not revoked, not expired
  - Generate new access + refresh token pair
  - Mark old token as `replacedById` (new token's ID)
  - Return new tokens

- Implement `AuthController.refresh()`:

  ```typescript
  @Post('refresh')
  @Public()
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    const tokens = await this.authService.refreshTokens(refreshToken);
    setRefreshTokenCookie(response, tokens.refreshToken, this.cookieConfig);
    return { accessToken: tokens.accessToken };
  }
  ```

**5.2 Cryptographic Token Reuse Detection**

- Enhance `AuthService.refreshTokens`:

  ```typescript
  async refreshTokens(refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existingToken) throw new UnauthorizedException('Invalid refresh token');
    if (existingToken.revoked) {
      // Token reuse detected — revoke entire family
      await this.revokeTokenFamily(existingToken.familyId);
      throw new UnauthorizedException('Token reuse detected — session revoked');
    }
    if (existingToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const newRefreshTokenId = randomUUID();
    const newRefreshToken = `${newRefreshTokenId}.${randomBytes(32).toString('hex')}`;
    const newTokenHash = await bcrypt.hash(newRefreshToken, 10);

    // Mark old token as replaced
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { replacedById: newRefreshTokenId },
    });

    // Create new token
    await this.prisma.refreshToken.create({
      data: {
        id: newRefreshTokenId,
        userId: existingToken.userId,
        tokenHash: newTokenHash,
        familyId: existingToken.familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = this.jwtService.sign(
      this.tokenPayloadFactory.buildAccessTokenPayload(existingToken.user, this.jwtConfig),
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  private async revokeTokenFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId },
      data: { revoked: true },
    });
  }
  ```

**5.3 Session Revocation (Logout Controller)**

- Implement `AuthService.logout(refreshToken: string)`:

  ```typescript
  async logout(refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }
  ```

- Implement `AuthController.logout()`:
  ```typescript
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearRefreshTokenCookie(response);
    return { message: 'Logged out successfully' };
  }
  ```

**Testing 5.1–5.3:**

- Unit test: `refreshTokens` returns new access + refresh pair
- Unit test: `refreshTokens` marks old token as `replacedById`
- Unit test: `refreshTokens` revokes entire family on token reuse (mock Prisma)
- Unit test: `logout` revokes token in database
- E2E test: `/api/v1/auth/refresh` returns new tokens and sets cookie
- E2E test: reusing a refresh token revokes all tokens in family
- E2E test: `/api/v1/auth/logout` clears cookie and revokes token

---

### Phase 6: Auth Endpoints Integration

**6.1 Login Endpoint**

- Implement `AuthService.login(email: string, password: string)`:
  - Query user by email with `AuthenticationProvider` (type: LOCAL)
  - Compare password hash with bcrypt
  - Generate access + refresh token pair
  - Store refresh token in database
  - Return tokens + user object

- Implement `AuthController.login()`:
  ```typescript
  @Post('login')
  @Public()
  @UseSchema(loginSchema)
  async login(@Body() body: LoginInput, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(body.email, body.password);
    setRefreshTokenCookie(response, result.refreshToken, this.cookieConfig);
    return { accessToken: result.accessToken, user: result.user };
  }
  ```

**6.2 Register Endpoint**

- Implement `AuthService.register(input: RegisterInput)`:
  - Hash password with bcrypt (10 rounds)
  - Create user + `AuthenticationProvider` in transaction
  - Generate access + refresh token pair
  - Store refresh token
  - Return tokens + user object

- Implement `AuthController.register()`:
  ```typescript
  @Post('register')
  @Public()
  @UseSchema(registerSchema)
  async register(@Body() body: RegisterInput, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(body);
    setRefreshTokenCookie(response, result.refreshToken, this.cookieConfig);
    return { accessToken: result.accessToken, user: result.user };
  }
  ```

**6.3 Profile Endpoint**

- Implement `AuthService.getProfile(userId: string)`:
  - Query user by ID
  - Return profile object

- Implement `AuthService.updateProfile(userId: string, input: ProfileUpdateInput)`:
  - Update user fields
  - Return updated profile

- Implement `AuthController.getProfile()`:

  ```typescript
  @Get('profile')
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }
  ```

- Implement `AuthController.updateProfile()`:
  ```typescript
  @Patch('profile')
  @UseSchema(profileUpdateSchema)
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() body: ProfileUpdateInput,
  ) {
    return this.authService.updateProfile(userId, body);
  }
  ```

**Testing 6.1–6.3:**

- E2E test: `/api/v1/auth/register` creates user, returns tokens, sets cookie
- E2E test: `/api/v1/auth/login` validates credentials, returns tokens
- E2E test: `/api/v1/auth/login` rejects invalid credentials with 401
- E2E test: `/api/v1/auth/profile` returns user data for authenticated user
- E2E test: `/api/v1/auth/profile` PATCH updates user data

---

### Phase 7: End-to-End Integration Tests

**7.1 Full Auth Flow Test**

```typescript
describe('Auth Flow (e2e)', () => {
  it('register → login → refresh → profile → logout', async () => {
    // 1. Register new user
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'Test1234!', confirmPassword: 'Test1234!' })
      .expect(201);

    const { accessToken, user } = registerRes.body;
    const refreshTokenCookie = registerRes.headers['set-cookie'][0];

    // 2. Access protected route
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // 3. Refresh tokens
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshTokenCookie)
      .expect(201);

    const newAccessToken = refreshRes.body.accessToken;

    // 4. Logout
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshTokenCookie)
      .expect(201);

    // 5. Verify old token revoked
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshTokenCookie)
      .expect(401);
  });
});
```

**7.2 Token Reuse Detection Test**

```typescript
it('detects token reuse and revokes family', async () => {
  // 1. Login and get refresh token
  // 2. Refresh once (valid)
  // 3. Attempt to refresh with old token (reuse detected)
  // 4. Verify all tokens in family are revoked
  // 5. Verify user must re-authenticate
});
```

**7.3 RBAC Integration Test**

```typescript
it('enforces role-based access control', async () => {
  // 1. Login as MEMBER
  // 2. Attempt admin-only route → 403
  // 3. Login as ADMIN
  // 4. Access admin-only route → 200
});
```

---

## File Structure Summary

```
apps/api/src/
  auth/
    config/
      jwt.config.ts
    controllers/
      auth.controller.ts (update existing)
    decorators/
      roles.decorator.ts
      permissions.decorator.ts
    dto/
      login.dto.ts
      register.dto.ts
    entities/
      auth-response.entity.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
      permissions.guard.ts
    interfaces/
      token-payload.interface.ts
      authenticated-user.interface.ts
    services/
      auth.service.ts (update existing)
    utilities/
      cookie.utility.ts
      token-payload.factory.ts
    auth.module.ts (update existing)
  common/
    decorators/
      current-user.decorator.ts
      public.decorator.ts
```

---

## Testing Strategy Summary

| Component         | Test Type | Count  |
| ----------------- | --------- | ------ |
| JWT config        | Unit      | 3      |
| Payload factories | Unit      | 4      |
| Cookie utilities  | Unit      | 3      |
| JWT auth guard    | Unit      | 5      |
| Roles guard       | Unit      | 3      |
| Permissions guard | Unit      | 3      |
| Auth service      | Unit      | 8      |
| Auth endpoints    | E2E       | 12     |
| Full auth flow    | E2E       | 3      |
| **Total**         |           | **44** |

---

## Execution Order

1. **Phase 0** (Prerequisites) — 2 hours
2. **Phase 1** (Token signing) — 3 hours
3. **Phase 2** (Cookie transmission) — 2 hours
4. **Phase 3** (Route guards) — 4 hours
5. **Phase 4** (RBAC) — 3 hours
6. **Phase 5** (Session revocation) — 5 hours
7. **Phase 6** (Auth endpoints) — 4 hours
8. **Phase 7** (Integration tests) — 3 hours

**Total estimated time: 26 hours**

---

## Critical Dependencies

- Prisma schema must be synced before any auth logic
- `@nestjs/jwt` must be installed before JWT module config
- `bcrypt` must be installed before password hashing
- `cookie-parser` must be installed before cookie middleware

---

## Updated Plan with Tenant System & Design Decisions

### Key Changes from Original Plan

**1. Prisma Schema Updates**

```prisma
enum Role {
  SUPER_ADMIN
  ADMIN
  MEMBER
  GUEST
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  PENDING
}

enum AuthProviderType {
  LOCAL
  GITHUB
  GOOGLE
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  status    UserStatus @default(PENDING)
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  authProviders AuthenticationProvider[]
  refreshTokens RefreshToken[]
  tenants       UserTenant[]
}

model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     UserTenant[]
  projects  Project[] // Future resource
}

model UserTenant {
  userId   String
  tenantId String
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@id([userId, tenantId])
}

model AuthenticationProvider {
  id             String   @id @default(cuid())
  userId         String
  type           AuthProviderType
  providerUserId String
  passwordHash   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([type, providerUserId])
}

model RefreshToken {
  id           String    @id @default(cuid())
  userId       String
  tokenHash    String    @unique
  familyId     String
  replacedById String?
  revoked      Boolean   @default(false)
  expiresAt    DateTime
  createdAt    DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**2. Global API Prefix**

- Set `app.setGlobalPrefix('api/v1')` in `main.ts`
- Exclude health check: `app.setGlobalPrefix('api/v1', { exclude: ['/health'] })`

**3. Password Hashing**

- Replace `bcrypt` with `argon2` in dependencies
- Use `argon2.hash(password)` and `argon2.verify(hash, password)`

**4. Rate Limiting**

- Install `@nestjs/throttler`
- Configure in `app.module.ts`:
  ```typescript
  ThrottlerModule.forRoot([
    {
      ttl: 60000,
      limit: 10,
    },
  ]);
  ```
- Apply stricter limits to auth endpoints:
  ```typescript
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  ```

**5. Tenant System Implementation**

**5.1 Tenant Selection Flow**

- Login endpoint returns list of accessible tenants (if user belongs to multiple)
- User must select tenant → receives JWT with `tenantId` claim
- Or: login accepts optional `tenantId` parameter for single-tenant users

**5.2 JWT Payload with Tenant Context**

```typescript
interface AccessTokenPayload {
  sub: string; // User ID
  tenantId: string; // Active tenant
  role: Role; // Global role
  status: UserStatus;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}
```

**5.3 Tenant Guard**

- Create `TenantGuard` to verify user belongs to active tenant
- Extract `tenantId` from JWT
- Query `UserTenant` to verify membership
- Attach tenant context to request

**5.4 Tenant-Scoped Resources**

- All future models (Project, Task, etc.) include `tenantId` foreign key
- Use tenant-scoped Prisma queries:
  ```typescript
  this.prisma.project.findMany({
    where: { tenantId: request.tenantId },
  });
  ```

**6. Super Admin Tenant Creation**

- Create `TenantController` with `POST /api/v1/tenants`
- Protect with `@Roles(Role.SUPER_ADMIN)`
- Endpoint creates tenant + assigns creator as first member

**7. Updated Dependencies**

```bash
pnpm --filter @apps/api add @nestjs/jwt @nestjs/passport passport passport-jwt argon2 cookie-parser @nestjs/throttler
pnpm --filter @apps/api add -D @types/passport-jwt
```

**8. Updated Environment Variables**

```env
JWT_SECRET=...
JWT_PRIVATE_KEY=...  # Base64-encoded RSA private key (production)
JWT_PUBLIC_KEY=...   # Base64-encoded RSA public key (production)
JWT_EXPIRES_IN_ACCESS=15m
JWT_EXPIRES_IN_REFRESH=7d
JWT_ISSUER=turborepo-api
JWT_AUDIENCE=turborepo-client
COOKIE_SECURE=false
THROTTLE_TTL=60000
THROTTLE_LIMIT=10
```

**9. Updated File Structure**

```
apps/api/src/
  auth/
    config/
      jwt.config.ts
    controllers/
      auth.controller.ts
    decorators/
      roles.decorator.ts
      permissions.decorator.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
      permissions.guard.ts
      tenant.guard.ts
    interfaces/
      token-payload.interface.ts
      authenticated-user.interface.ts
    services/
      auth.service.ts
    utilities/
      cookie.utility.ts
      token-payload.factory.ts
    auth.module.ts
  tenant/
    tenant.controller.ts
    tenant.service.ts
    tenant.module.ts
  common/
    decorators/
      current-user.decorator.ts
      public.decorator.ts
      current-tenant.decorator.ts
```

**10. Updated Testing Strategy**

| Component         | Test Type | Count  |
| ----------------- | --------- | ------ |
| JWT config        | Unit      | 3      |
| Payload factories | Unit      | 4      |
| Cookie utilities  | Unit      | 3      |
| JWT auth guard    | Unit      | 5      |
| Tenant guard      | Unit      | 4      |
| Roles guard       | Unit      | 3      |
| Permissions guard | Unit      | 3      |
| Auth service      | Unit      | 8      |
| Tenant service    | Unit      | 4      |
| Auth endpoints    | E2E       | 12     |
| Tenant endpoints  | E2E       | 4      |
| Full auth flow    | E2E       | 3      |
| **Total**         |           | **56** |

**11. Updated Execution Order**

1. **Phase 0** (Prerequisites: schema sync, deps, env) — 3 hours
2. **Phase 1** (Token signing with tenant context) — 3 hours
3. **Phase 2** (Cookie transmission) — 2 hours
4. **Phase 3** (Route guards including tenant guard) — 5 hours
5. **Phase 4** (RBAC) — 3 hours
6. **Phase 5** (Session revocation) — 5 hours
7. **Phase 6** (Auth endpoints with tenant selection) — 5 hours
8. **Phase 7** (Tenant management endpoints) — 3 hours
9. **Phase 8** (Integration tests) — 4 hours

**Total estimated time: 33 hours**
