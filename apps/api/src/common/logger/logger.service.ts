import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = pino({
      level: isProduction ? 'info' : 'debug',
      ...(isProduction
        ? {}
        : {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
          }),
    });
  }

  log(message: string, context?: Record<string, unknown>) {
    this.logger.info(context, message);
  }

  error(message: string, trace?: string, context?: Record<string, unknown>) {
    this.logger.error({ ...context, trace }, message);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.logger.warn(context, message);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.logger.debug(context, message);
  }
}
