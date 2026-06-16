'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const testing_1 = require('@nestjs/testing');
const health_controller_js_1 = require('../src/health/health.controller.js');
const database_module_js_1 = require('../src/database/database.module.js');
const test_db_js_1 = require('./helpers/test-db.js');
(0, vitest_1.describe)('HealthController (integration)', () => {
  let controller;
  let prisma;
  (0, vitest_1.beforeAll)(async () => {
    await (0, test_db_js_1.setupTestDatabase)();
  });
  (0, vitest_1.afterAll)(async () => {
    await (0, test_db_js_1.teardownTestDatabase)();
  });
  (0, vitest_1.beforeEach)(async () => {
    prisma = await (0, test_db_js_1.getTestPrismaClient)();
    const module = await testing_1.Test.createTestingModule({
      controllers: [health_controller_js_1.HealthController],
      providers: [
        {
          provide: database_module_js_1.PRISMA_CLIENT,
          useValue: prisma,
        },
      ],
    }).compile();
    controller = module.get(health_controller_js_1.HealthController);
  });
  (0, vitest_1.it)('should be defined', () => {
    (0, vitest_1.expect)(controller).toBeDefined();
  });
  (0, vitest_1.it)('should return health status with api ok', async () => {
    const result = await controller.check();
    (0, vitest_1.expect)(result.api).toBe('ok');
  });
  (0, vitest_1.it)('should return health status with database ok when DB is healthy', async () => {
    const result = await controller.check();
    (0, vitest_1.expect)(result.database).toBe('ok');
  });
  (0, vitest_1.it)('should include timestamp in response', async () => {
    const result = await controller.check();
    (0, vitest_1.expect)(result.timestamp).toBeDefined();
    (0, vitest_1.expect)(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
  (0, vitest_1.it)('should return database error when DB query fails', async () => {
    const mockPrisma = {
      $queryRaw: async () => {
        throw new Error('Database connection failed');
      },
    };
    const module = await testing_1.Test.createTestingModule({
      controllers: [health_controller_js_1.HealthController],
      providers: [
        {
          provide: database_module_js_1.PRISMA_CLIENT,
          useValue: mockPrisma,
        },
      ],
    }).compile();
    const controllerWithError = module.get(health_controller_js_1.HealthController);
    const result = await controllerWithError.check();
    (0, vitest_1.expect)(result.api).toBe('ok');
    (0, vitest_1.expect)(result.database).toBe('error');
    (0, vitest_1.expect)(result.timestamp).toBeDefined();
  });
  (0, vitest_1.it)('should perform real database query', async () => {
    const result = await controller.check();
    (0, vitest_1.expect)(result.database).toBe('ok');
  });
  (0, vitest_1.it)('should return correct response structure', async () => {
    const result = await controller.check();
    (0, vitest_1.expect)(result).toHaveProperty('api');
    (0, vitest_1.expect)(result).toHaveProperty('database');
    (0, vitest_1.expect)(result).toHaveProperty('timestamp');
    (0, vitest_1.expect)(Object.keys(result)).toHaveLength(3);
  });
});
//# sourceMappingURL=health.controller.spec.js.map
