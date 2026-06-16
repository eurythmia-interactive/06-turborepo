'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const common_1 = require('@nestjs/common');
const testing_1 = require('@nestjs/testing');
const supertest_1 = __importDefault(require('supertest'));
const config_1 = require('@nestjs/config');
const env_validation_js_1 = require('../../src/config/env.validation.js');
const test_db_js_1 = require('../helpers/test-db.js');
let CorsTestController = class CorsTestController {
  test() {
    return { message: 'ok' };
  }
};
__decorate(
  [
    (0, common_1.Get)(),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  CorsTestController.prototype,
  'test',
  null,
);
CorsTestController = __decorate([(0, common_1.Controller)('cors-test')], CorsTestController);
(0, vitest_1.describe)('CORS E2E', () => {
  let app;
  (0, vitest_1.beforeAll)(async () => {
    await (0, test_db_js_1.setupTestDatabase)();
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
              CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3001'],
            }),
          ],
        }),
      ],
      controllers: [CorsTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    const configService = app.get(config_1.ConfigService);
    const corsOrigins = configService.get('CORS_ORIGINS', []);
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });
    await app.init();
  });
  (0, vitest_1.afterAll)(async () => {
    await (0, test_db_js_1.cleanTestDatabase)();
    await app.close();
    await (0, test_db_js_1.teardownTestDatabase)();
  });
  (0, vitest_1.describe)('GET /cors-test', () => {
    (0, vitest_1.it)('should allow requests from allowed origin', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .get('/cors-test')
        .set('Origin', 'http://localhost:3000');
      (0, vitest_1.expect)(response.status).toBe(200);
      (0, vitest_1.expect)(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
    });
    (0, vitest_1.it)('should allow requests from second allowed origin', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .get('/cors-test')
        .set('Origin', 'http://localhost:3001');
      (0, vitest_1.expect)(response.status).toBe(200);
      (0, vitest_1.expect)(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );
    });
    (0, vitest_1.it)('should not include CORS headers for disallowed origin', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .get('/cors-test')
        .set('Origin', 'http://evil.com');
      (0, vitest_1.expect)(response.status).toBe(200);
      (0, vitest_1.expect)(response.headers['access-control-allow-origin']).toBeUndefined();
    });
    (0, vitest_1.it)('should include credentials header', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .get('/cors-test')
        .set('Origin', 'http://localhost:3000');
      (0, vitest_1.expect)(response.headers['access-control-allow-credentials']).toBe('true');
    });
    (0, vitest_1.it)('should handle preflight OPTIONS request', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .options('/cors-test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      (0, vitest_1.expect)(response.status).toBe(204);
      (0, vitest_1.expect)(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
    });
    (0, vitest_1.it)('should include allowed methods in preflight', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .options('/cors-test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      (0, vitest_1.expect)(response.headers['access-control-allow-methods']).toBeDefined();
    });
    (0, vitest_1.it)('should handle requests without Origin header', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/cors-test');
      (0, vitest_1.expect)(response.status).toBe(200);
      (0, vitest_1.expect)(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
//# sourceMappingURL=cors.e2e-spec.js.map
