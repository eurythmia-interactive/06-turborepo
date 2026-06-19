import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AdminThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const ips = req.ips as string[] | undefined;
    const ip = req.ip as string | undefined;

    if (ips && ips.length > 0 && ips[0]) {
      return ips[0];
    }

    if (ip) {
      return ip;
    }

    return 'unknown';
  }
}
