'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const testing_1 = require('@nestjs/testing');
const database_module_js_1 = require('../src/database/database.module.js');
const test_db_js_1 = require('./helpers/test-db.js');
(0, vitest_1.describe)('DatabaseModule (integration)', () => {
  let module;
  let prisma;
  (0, vitest_1.beforeAll)(async () => {
    await (0, test_db_js_1.setupTestDatabase)();
  });
  (0, vitest_1.afterAll)(async () => {
    await (0, test_db_js_1.teardownTestDatabase)();
  });
  (0, vitest_1.beforeEach)(async () => {
    await (0, test_db_js_1.cleanTestDatabase)();
    module = await testing_1.Test.createTestingModule({
      imports: [database_module_js_1.DatabaseModule],
    }).compile();
    prisma = module.get(database_module_js_1.PRISMA_CLIENT);
  });
  (0, vitest_1.it)('should provide Prisma client', () => {
    (0, vitest_1.expect)(prisma).toBeDefined();
    (0, vitest_1.expect)(prisma).toBeInstanceOf(Object);
  });
  (0, vitest_1.it)('should export Prisma client for other modules', () => {
    const exportedPrisma = module.get(database_module_js_1.PRISMA_CLIENT);
    (0, vitest_1.expect)(exportedPrisma).toBe(prisma);
  });
  (0, vitest_1.it)('should provide singleton instance', async () => {
    const module2 = await testing_1.Test.createTestingModule({
      imports: [database_module_js_1.DatabaseModule],
    }).compile();
    const prisma1 = module.get(database_module_js_1.PRISMA_CLIENT);
    const prisma2 = module2.get(database_module_js_1.PRISMA_CLIENT);
    (0, vitest_1.expect)(prisma1).toBe(prisma2);
    await module2.close();
  });
  (0, vitest_1.it)('should connect to test database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    (0, vitest_1.expect)(result).toBeDefined();
  });
  (0, vitest_1.it)('should be able to create and query users', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    (0, vitest_1.expect)(user.id).toBeDefined();
    (0, vitest_1.expect)(user.email).toBe('test@example.com');
    const foundUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    (0, vitest_1.expect)(foundUser).toBeDefined();
    (0, vitest_1.expect)(foundUser?.email).toBe('test@example.com');
  });
  (0, vitest_1.it)('should clean database between tests', async () => {
    const users = await prisma.user.findMany();
    (0, vitest_1.expect)(users).toHaveLength(0);
  });
});
//# sourceMappingURL=database.module.spec.js.map
