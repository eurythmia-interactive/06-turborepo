'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTestUser = createTestUser;
exports.createTestRefreshToken = createTestRefreshToken;
const database_1 = require('@repo/database');
const node_crypto_1 = require('node:crypto');
async function createTestUser(prisma, options = {}) {
  const email = options.email ?? `test-${(0, node_crypto_1.randomUUID)()}@example.com`;
  const passwordHash = options.passwordHash ?? '$2b$10$test-hash-placeholder';
  const user = await prisma.user.create({
    data: {
      email,
      name: options.name ?? 'Test User',
      role: options.role ?? database_1.Role.MEMBER,
      status: options.status ?? database_1.UserStatus.ACTIVE,
      authProviders: {
        create: {
          type: options.authProviderType ?? database_1.AuthProviderType.LOCAL,
          providerUserId: email,
          passwordHash,
        },
      },
    },
  });
  return user;
}
async function createTestRefreshToken(prisma, userId, options = {}) {
  const token = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: options.tokenHash ?? (0, node_crypto_1.randomUUID)(),
      familyId: options.familyId ?? (0, node_crypto_1.randomUUID)(),
      revoked: options.revoked ?? false,
      expiresAt: options.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return token.id;
}
//# sourceMappingURL=fixtures.js.map
