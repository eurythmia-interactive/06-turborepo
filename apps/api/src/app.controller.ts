import { Controller, Get } from '@nestjs/common';
import { createResponse, HEALTH_CHECK } from '@repo/shared';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return createResponse({ status: HEALTH_CHECK });
  }

  @Get()
  getRoot() {
    return {
      name: '@apps/api',
      framework: 'NestJS',
      version: '11.x',
    };
  }
}
