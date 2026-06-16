'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const testing_1 = require('@nestjs/testing');
const supertest_1 = __importDefault(require('supertest'));
const config_1 = require('@nestjs/config');
const health_module_js_1 = require('../../src/health/health.module.js');
const database_module_js_1 = require('../../src/database/database.module.js');
const database_module_js_2 = require('../../src/database/database.module.js');
const global_exception_filter_js_1 = require('../../src/common/filters/global-exception.filter.js');
const test_db_js_1 = require('../helpers/test-db.js');
const env_validation_js_1 = require('../../src/config/env.validation.js');
const test_db_js_2 = require('../helpers/test-db.js');
(0, vitest_1.describe)('Health E2E', () => {
  let app;
  (0, vitest_1.beforeAll)(async () => {
    const testPrisma = await (0, test_db_js_1.getTestPrismaClient)();
    const moduleRef = await testing_1.Test.createTestingModule({
      imports: [
        config_1.ConfigModule.forRoot({
          isGlobal: true,
          validate: env_validation_js_1.validate,
          envFilePath: '../../.env',
          load: [
            () => ({
              NODE_ENV: 'test',
              PORT: 0,
              JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
              JWT_EXPIRES_IN: '1h',
              CORS_ORIGINS: ['http://localhost:3000'],
            }),
          ],
        }),
        database_module_js_1.DatabaseModule,
        health_module_js_1.HealthModule,
      ],
    })
      .overrideProvider(database_module_js_2.PRISMA_CLIENT)
      .useValue(testPrisma)
      .compile();
    app = moduleRef.createNestApplication();
    const configService = app.get(config_1.ConfigService);
    app.useGlobalFilters(new global_exception_filter_js_1.GlobalExceptionFilter(configService));
    await app.init();
  });
  (0, vitest_1.afterAll)(async () => {
    await (0, test_db_js_2.cleanTestDatabase)();
    await app.close();
  });
  (0, vitest_1.describe)('GET /health', () => {
    (0, vitest_1.it)('should return 200', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
      (0, vitest_1.expect)(response.status).toBe(200);
    });
    (0, vitest_1.it)('should return correct structure', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
      (0, vitest_1.expect)(response.body).toHaveProperty('api');
      (0, vitest_1.expect)(response.body).toHaveProperty('database');
      (0, vitest_1.expect)(response.body).toHaveProperty('timestamp');
    });
    (0, vitest_1.it)('should return api status ok', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
      (0, vitest_1.expect)(response.body.api).toBe('ok');
    });
    (0, vitest_1.it)('should return database status ok when DB is healthy', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
      (0, vitest_1.expect)(response.body.database).toBe('ok');
    });
    (0, vitest_1.it)('should include timestamp as ISO string', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
      (0, vitest_1.expect)(response.body.timestamp).toBeDefined();
      (0, vitest_1.expect)(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp,
      );
    });
    (0, vitest_1.it)('should return JSON content type', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
      (0, vitest_1.expect)(response.headers['content-type']).toMatch(/json/);
    });
  });
});
//# sourceMappingURL=health.e2e-spec.js.map
