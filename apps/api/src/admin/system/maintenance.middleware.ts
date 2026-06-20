import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from './maintenance.service.js';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/health') {
      return next();
    }

    if (req.path.startsWith('/api/v1/admin')) {
      return next();
    }

    if (req.path.startsWith('/api/v1/auth')) {
      return next();
    }

    const user = (req as any).user;
    if (user?.role === 'SUPER_ADMIN') {
      return next();
    }

    try {
      const status = await this.maintenanceService.getStatus();
      if (status.enabled) {
        res.status(503).json({
          error: 'Service Unavailable',
          message: status.message || 'System is under maintenance',
          scheduledEnd: status.scheduledEnd || null,
        });
        return;
      }
    } catch {}

    next();
  }
}
