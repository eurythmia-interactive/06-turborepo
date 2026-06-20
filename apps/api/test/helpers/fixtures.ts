import { PrismaClient, Role, UserStatus, AuthProviderType } from '@repo/database';
import { randomUUID } from 'node:crypto';
import { randomBytes } from 'node:crypto';

export interface TestUser {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  role: Role;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserOptions {
  email?: string;
  name?: string;
  role?: Role;
  status?: UserStatus;
  passwordHash?: string;
  authProviderType?: AuthProviderType;
}

export async function createTestUser(
  prisma: PrismaClient,
  options: CreateUserOptions = {},
): Promise<TestUser> {
  const email = options.email ?? `test-${randomUUID()}@example.com`;
  const passwordHash = options.passwordHash ?? '$2b$10$test-hash-placeholder';

  const user = await prisma.user.create({
    data: {
      email,
      name: options.name ?? 'Test User',
      role: options.role ?? Role.MEMBER,
      status: options.status ?? UserStatus.ACTIVE,
      providers: {
        create: {
          type: options.authProviderType ?? AuthProviderType.LOCAL,
          providerUserId: email,
          passwordHash,
        },
      },
    },
  });

  return user;
}

export async function createTestRefreshToken(
  prisma: PrismaClient,
  userId: string,
  options: {
    tokenHash?: string;
    familyId?: string;
    revoked?: boolean;
    expiresAt?: Date;
  } = {},
): Promise<string> {
  const token = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: options.tokenHash ?? randomUUID(),
      familyId: options.familyId ?? randomUUID(),
      revoked: options.revoked ?? false,
      expiresAt: options.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return token.id;
}

export async function createTestTenant(
  prisma: PrismaClient,
  userId: string,
  options: {
    name?: string;
    slug?: string;
  } = {},
) {
  const slug = options.slug ?? `tenant-${randomUUID().slice(0, 8)}`;
  const tenant = await prisma.tenant.create({
    data: {
      name: options.name ?? 'Test Tenant',
      slug,
      users: {
        create: {
          userId,
        },
      },
    },
  });

  return tenant;
}

export async function createTestInvitation(
  prisma: PrismaClient,
  invitedBy: string,
  options: {
    email?: string;
    tenantId?: string;
    role?: Role;
    expiresAt?: Date;
    acceptedAt?: Date | null;
  } = {},
) {
  const token = randomBytes(32).toString('hex');
  const invitation = await prisma.userInvitation.create({
    data: {
      email: options.email ?? `invite-${randomUUID()}@example.com`,
      token,
      tenantId: options.tenantId ?? null,
      role: options.role ?? Role.MEMBER,
      invitedBy,
      expiresAt: options.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: options.acceptedAt ?? null,
    },
  });

  return invitation;
}
