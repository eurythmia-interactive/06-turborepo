'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTestApp = createTestApp;
exports.closeTestApp = closeTestApp;
const testing_1 = require('@nestjs/testing');
const config_1 = require('@nestjs/config');
const zod_validation_pipe_js_1 = require('../../src/common/pipes/zod-validation.pipe.js');
const global_exception_filter_js_1 = require('../../src/common/filters/global-exception.filter.js');
const database_module_js_1 = require('../../src/database/database.module.js');
const test_db_js_1 = require('./test-db.js');
const app_module_js_1 = require('../../src/app.module.js');
async function createTestApp() {
  const testPrisma = await (0, test_db_js_1.getTestPrismaClient)();
  const moduleFixture = await testing_1.Test.createTestingModule({
    imports: [app_module_js_1.AppModule],
  })
    .overrideProvider(database_module_js_1.PRISMA_CLIENT)
    .useValue(testPrisma)
    .compile();
  const app = moduleFixture.createNestApplication();
  const configService = app.get(config_1.ConfigService);
  app.useGlobalPipes(new zod_validation_pipe_js_1.ZodValidationPipe());
  app.useGlobalFilters(new global_exception_filter_js_1.GlobalExceptionFilter(configService));
  await app.init();
  return app;
}
async function closeTestApp(app) {
  if (app) {
    await app.close();
  }
}
//# sourceMappingURL=test-app.js.map
