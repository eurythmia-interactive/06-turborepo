'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.setupTestDatabase = setupTestDatabase;
exports.teardownTestDatabase = teardownTestDatabase;
exports.cleanTestDatabase = cleanTestDatabase;
exports.getTestPrismaClient = getTestPrismaClient;
const database_1 = require('@repo/database');
async function setupTestDatabase() {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://turborepo:turborepo@localhost:5432/turborepo_test?schema=public';
  process.env.DATABASE_URL = connectionString;
  process.env.DIRECT_URL = connectionString;
  await database_1.prisma.$connect();
  return { connectionString, prisma: database_1.prisma };
}
async function teardownTestDatabase() {
  await database_1.prisma.$disconnect();
}
async function cleanTestDatabase() {
  await database_1.prisma.refreshToken.deleteMany();
  await database_1.prisma.authenticationProvider.deleteMany();
  await database_1.prisma.user.deleteMany();
}
async function getTestPrismaClient() {
  return database_1.prisma;
}
//# sourceMappingURL=test-db.js.map
