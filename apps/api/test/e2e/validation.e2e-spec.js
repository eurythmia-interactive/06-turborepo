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
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
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
const zod_1 = require('zod');
const config_1 = require('@nestjs/config');
const zod_validation_pipe_js_1 = require('../../src/common/pipes/zod-validation.pipe.js');
const global_exception_filter_js_1 = require('../../src/common/filters/global-exception.filter.js');
const env_validation_js_1 = require('../../src/config/env.validation.js');
const test_db_js_1 = require('../helpers/test-db.js');
const testSchema = zod_1.z.object({
  email: zod_1.z.string().email('Invalid email address'),
  password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
  name: zod_1.z.string().min(1, 'Name is required').optional(),
});
let TestController = class TestController {
  createValid(body) {
    return { success: true, data: body };
  }
};
__decorate(
  [
    (0, common_1.Post)('valid'),
    (0, common_1.UsePipes)(new zod_validation_pipe_js_1.ZodValidationPipe(testSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', void 0),
  ],
  TestController.prototype,
  'createValid',
  null,
);
TestController = __decorate([(0, common_1.Controller)('test')], TestController);
(0, vitest_1.describe)('Validation E2E', () => {
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
              CORS_ORIGINS: ['http://localhost:3000'],
            }),
          ],
        }),
      ],
      controllers: [TestController],
    }).compile();
    app = moduleRef.createNestApplication();
    const configService = app.get(config_1.ConfigService);
    app.useGlobalFilters(new global_exception_filter_js_1.GlobalExceptionFilter(configService));
    await app.init();
  });
  (0, vitest_1.afterAll)(async () => {
    await (0, test_db_js_1.cleanTestDatabase)();
    await app.close();
    await (0, test_db_js_1.teardownTestDatabase)();
  });
  (0, vitest_1.describe)('POST /test/valid', () => {
    (0, vitest_1.it)('should return 201 with valid data', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .post('/test/valid')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
      (0, vitest_1.expect)(response.status).toBe(201);
      (0, vitest_1.expect)(response.body.success).toBe(true);
      (0, vitest_1.expect)(response.body.data.email).toBe('test@example.com');
    });
    (0, vitest_1.it)('should return 400 for invalid email', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .post('/test/valid')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });
      (0, vitest_1.expect)(response.status).toBe(400);
      (0, vitest_1.expect)(response.body.statusCode).toBe(400);
      (0, vitest_1.expect)(response.body.message).toBe('Validation failed');
      (0, vitest_1.expect)(response.body.errors).toHaveProperty('email');
      (0, vitest_1.expect)(response.body.errors.email).toContain('Invalid email address');
    });
    (0, vitest_1.it)('should return 400 for short password', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .post('/test/valid')
        .send({
          email: 'test@example.com',
          password: 'short',
        });
      (0, vitest_1.expect)(response.status).toBe(400);
      (0, vitest_1.expect)(response.body.errors).toHaveProperty('password');
      (0, vitest_1.expect)(response.body.errors.password).toContain(
        'Password must be at least 8 characters',
      );
    });
    (0, vitest_1.it)('should return 400 for missing required fields', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .post('/test/valid')
        .send({});
      (0, vitest_1.expect)(response.status).toBe(400);
      (0, vitest_1.expect)(response.body.errors).toHaveProperty('email');
      (0, vitest_1.expect)(response.body.errors).toHaveProperty('password');
    });
    (0, vitest_1.it)('should group multiple errors per field', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .post('/test/valid')
        .send({
          email: 'invalid',
          password: 'x',
        });
      (0, vitest_1.expect)(response.status).toBe(400);
      (0, vitest_1.expect)(response.body.errors.email).toBeDefined();
      (0, vitest_1.expect)(response.body.errors.password).toBeDefined();
    });
    (0, vitest_1.it)('should include timestamp in error response', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .post('/test/valid')
        .send({ email: 'invalid' });
      (0, vitest_1.expect)(response.body.timestamp).toBeDefined();
      (0, vitest_1.expect)(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp,
      );
    });
    (0, vitest_1.it)('should include path in error response', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .post('/test/valid')
        .send({ email: 'invalid' });
      (0, vitest_1.expect)(response.body.path).toBe('/test/valid');
    });
    (0, vitest_1.it)('should handle optional fields correctly', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer())
        .post('/test/valid')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
      (0, vitest_1.expect)(response.status).toBe(201);
      (0, vitest_1.expect)(response.body.data.name).toBeUndefined();
    });
  });
});
//# sourceMappingURL=validation.e2e-spec.js.map
