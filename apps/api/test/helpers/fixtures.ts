import { PrismaClient, Role, UserStatus, AuthProviderType } from '@repo/database';
import { randomUUID } from 'node:crypto';

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
      authProviders: {
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
