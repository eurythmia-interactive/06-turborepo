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
const zod_validation_pipe_js_1 = require('../../src/common/pipes/zod-validation.pipe.js');
const global_exception_filter_js_1 = require('../../src/common/filters/global-exception.filter.js');
const env_validation_js_1 = require('../../src/config/env.validation.js');
const test_db_js_1 = require('../helpers/test-db.js');
let ErrorTestController = class ErrorTestController {
  throwNotFound() {
    throw new common_1.HttpException('Resource not found', common_1.HttpStatus.NOT_FOUND);
  }
  throwBadRequest() {
    throw new common_1.HttpException('Bad request', common_1.HttpStatus.BAD_REQUEST);
  }
  throwUnauthorized() {
    throw new common_1.HttpException('Unauthorized', common_1.HttpStatus.UNAUTHORIZED);
  }
  throwConflict() {
    throw new common_1.HttpException('Resource already exists', common_1.HttpStatus.CONFLICT);
  }
  throwInternal() {
    throw new Error('Internal server error');
  }
  throwUnknown() {
    throw 'string error';
  }
};
__decorate(
  [
    (0, common_1.Get)('not-found'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  ErrorTestController.prototype,
  'throwNotFound',
  null,
);
__decorate(
  [
    (0, common_1.Get)('bad-request'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  ErrorTestController.prototype,
  'throwBadRequest',
  null,
);
__decorate(
  [
    (0, common_1.Get)('unauthorized'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  ErrorTestController.prototype,
  'throwUnauthorized',
  null,
);
__decorate(
  [
    (0, common_1.Get)('conflict'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  ErrorTestController.prototype,
  'throwConflict',
  null,
);
__decorate(
  [
    (0, common_1.Get)('internal'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  ErrorTestController.prototype,
  'throwInternal',
  null,
);
__decorate(
  [
    (0, common_1.Get)('unknown'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  ErrorTestController.prototype,
  'throwUnknown',
  null,
);
ErrorTestController = __decorate([(0, common_1.Controller)('errors')], ErrorTestController);
(0, vitest_1.describe)('Error Handling E2E', () => {
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
      controllers: [ErrorTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    const configService = app.get(config_1.ConfigService);
    app.useGlobalPipes(new zod_validation_pipe_js_1.ZodValidationPipe());
    app.useGlobalFilters(new global_exception_filter_js_1.GlobalExceptionFilter(configService));
    await app.init();
  });
  (0, vitest_1.afterAll)(async () => {
    await (0, test_db_js_1.cleanTestDatabase)();
    await app.close();
    await (0, test_db_js_1.teardownTestDatabase)();
  });
  (0, vitest_1.describe)('HTTP Exceptions', () => {
    (0, vitest_1.it)('should return 404 for not found', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/errors/not-found');
      (0, vitest_1.expect)(response.status).toBe(404);
      (0, vitest_1.expect)(response.body.statusCode).toBe(404);
      (0, vitest_1.expect)(response.body.message).toBe('Resource not found');
    });
    (0, vitest_1.it)('should return 400 for bad request', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get(
        '/errors/bad-request',
      );
      (0, vitest_1.expect)(response.status).toBe(400);
      (0, vitest_1.expect)(response.body.statusCode).toBe(400);
      (0, vitest_1.expect)(response.body.message).toBe('Bad request');
    });
    (0, vitest_1.it)('should return 401 for unauthorized', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get(
        '/errors/unauthorized',
      );
      (0, vitest_1.expect)(response.status).toBe(401);
      (0, vitest_1.expect)(response.body.statusCode).toBe(401);
      (0, vitest_1.expect)(response.body.message).toBe('Unauthorized');
    });
    (0, vitest_1.it)('should return 409 for conflict', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/errors/conflict');
      (0, vitest_1.expect)(response.status).toBe(409);
      (0, vitest_1.expect)(response.body.statusCode).toBe(409);
      (0, vitest_1.expect)(response.body.message).toBe('Resource already exists');
    });
  });
  (0, vitest_1.describe)('Unknown Exceptions', () => {
    (0, vitest_1.it)('should return 500 for unhandled errors', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/errors/internal');
      (0, vitest_1.expect)(response.status).toBe(500);
      (0, vitest_1.expect)(response.body.statusCode).toBe(500);
      (0, vitest_1.expect)(response.body.message).toBe('Internal server error');
    });
    (0, vitest_1.it)('should return 500 for non-Error exceptions', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/errors/unknown');
      (0, vitest_1.expect)(response.status).toBe(500);
      (0, vitest_1.expect)(response.body.statusCode).toBe(500);
    });
  });
  (0, vitest_1.describe)('Error Response Structure', () => {
    (0, vitest_1.it)('should include timestamp in error response', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/errors/not-found');
      (0, vitest_1.expect)(response.body.timestamp).toBeDefined();
      (0, vitest_1.expect)(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp,
      );
    });
    (0, vitest_1.it)('should include path in error response', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/errors/not-found');
      (0, vitest_1.expect)(response.body.path).toBe('/errors/not-found');
    });
    (0, vitest_1.it)('should include statusCode in response body', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get(
        '/errors/bad-request',
      );
      (0, vitest_1.expect)(response.body.statusCode).toBe(400);
    });
    (0, vitest_1.it)('should include message in response body', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/errors/not-found');
      (0, vitest_1.expect)(response.body.message).toBeDefined();
      (0, vitest_1.expect)(typeof response.body.message).toBe('string');
    });
    (0, vitest_1.it)('should return JSON content type', async () => {
      const response = await (0, supertest_1.default)(app.getHttpServer()).get('/errors/not-found');
      (0, vitest_1.expect)(response.headers['content-type']).toMatch(/json/);
    });
  });
  (0, vitest_1.describe)('Production Mode', () => {
    (0, vitest_1.it)('should hide stack traces in production', async () => {
      const prodApp = await testing_1.Test.createTestingModule({
        imports: [
          config_1.ConfigModule.forRoot({
            isGlobal: true,
            validate: env_validation_js_1.validate,
            envFilePath: '../../.env',
            load: [
              () => ({
                NODE_ENV: 'production',
                PORT: 0,
                JWT_SECRET: 'test-jwt-secret-key-for-testing-only-min-32-chars',
                JWT_EXPIRES_IN: '1h',
                CORS_ORIGINS: ['http://localhost:3000'],
              }),
            ],
          }),
        ],
        controllers: [ErrorTestController],
      }).compile();
      const app2 = prodApp.createNestApplication();
      const configService = app2.get(config_1.ConfigService);
      app2.useGlobalFilters(new global_exception_filter_js_1.GlobalExceptionFilter(configService));
      await app2.init();
      const response = await (0, supertest_1.default)(app2.getHttpServer()).get('/errors/internal');
      (0, vitest_1.expect)(response.status).toBe(500);
      (0, vitest_1.expect)(response.body.message).toBe('Internal server error');
      (0, vitest_1.expect)(response.body).not.toHaveProperty('stack');
      await app2.close();
    });
  });
});
//# sourceMappingURL=error-handling.e2e-spec.js.map
