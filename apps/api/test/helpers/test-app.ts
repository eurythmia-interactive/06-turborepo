import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { PRISMA_CLIENT } from '../../src/database/database.module.js';
import { getTestPrismaClient } from './test-db.js';
import { AppModule } from '../../src/app.module.js';
import { ThrottlerGuard } from '@nestjs/throttler';

export async function createTestApp(): Promise<INestApplication> {
  const testPrisma = await getTestPrismaClient();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PRISMA_CLIENT)
    .useValue(testPrisma)
    .overrideGuard(ThrottlerGuard)
    .useValue({
      canActivate: () => true,
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  const configService = app.get(ConfigService);

  app.use(cookieParser());

  app.setGlobalPrefix('api/v1', {
    exclude: ['/health'],
  });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  await app.init();

  return app;
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}
