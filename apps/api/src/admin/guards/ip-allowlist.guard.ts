import { Injectable, CanActivate, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { IpAllowlistService } from '../services/ip-allowlist.service.js';

@Injectable()
export class IpAllowlistGuard implements CanActivate {
  constructor(private readonly ipAllowlistService: IpAllowlistService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown';

    const allowed = await this.ipAllowlistService.isAllowed(ip);

    if (!allowed) {
      throw new ForbiddenException('Access from this IP is not permitted');
    }

    return true;
  }
}
