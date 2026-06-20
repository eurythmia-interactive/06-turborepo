import { Module, forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { MetricsAggregationService } from './metrics-aggregation.service.js';
import { UserGrowthService } from './user-growth.service.js';
import { TenantActivityService } from './tenant-activity.service.js';
import { DashboardCacheService } from './dashboard-cache.service.js';

@Module({
  imports: [forwardRef(() => AdminModule)],
  controllers: [AnalyticsController],
  providers: [
    MetricsAggregationService,
    UserGrowthService,
    TenantActivityService,
    DashboardCacheService,
  ],
  exports: [
    MetricsAggregationService,
    UserGrowthService,
    TenantActivityService,
    DashboardCacheService,
  ],
})
export class AnalyticsModule {}
