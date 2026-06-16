import { Injectable, type NestMiddleware, Inject } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { LoggerService } from '../logger/logger.service.js';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();
    req.headers['x-trace-id'] = traceId;

    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const contentLength = res.getHeader('content-length');

      this.logger.log('request completed', {
        traceId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        contentLength: contentLength ? Number(contentLength) : undefined,
      });
    });

    next();
  }
}
