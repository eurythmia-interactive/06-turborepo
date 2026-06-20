import { Global, Module } from '@nestjs/common';
import { PermissionCacheService } from './permission-cache.service.js';
import { PermissionResolverService } from './permission-resolver.service.js';

@Global()
@Module({
  providers: [PermissionCacheService, PermissionResolverService],
  exports: [PermissionCacheService, PermissionResolverService],
})
export class PermissionModule {}
