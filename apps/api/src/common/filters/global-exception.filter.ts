import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import type { Prisma } from '@repo/database';
import { ValidationException } from '../exceptions/validation.exception.js';

interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
  path: string;
}

const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'Resource already exists' },
  P2025: { status: 404, message: 'Resource not found' },
  P2003: { status: 409, message: 'Foreign key constraint failed' },
  P2021: { status: 404, message: 'Table does not exist' },
  P2022: { status: 404, message: 'Column does not exist' },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (exception instanceof ValidationException) {
      errorResponse.statusCode = 400;
      errorResponse.message = 'Validation failed';
      errorResponse.errors = exception.errors;
    } else if (exception instanceof HttpException) {
      errorResponse.statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      errorResponse.message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as Record<string, unknown>).message as string);
    } else if (exception instanceof Error && this.isPrismaError(exception)) {
      const prismaError = exception as Prisma.PrismaClientKnownRequestError;
      const mapped = PRISMA_ERROR_MAP[prismaError.code];
      if (mapped) {
        errorResponse.statusCode = mapped.status;
        errorResponse.message = mapped.message;
      } else {
        errorResponse.message = 'Database error';
      }
    } else if (exception instanceof Error) {
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      if (!isProduction) {
        console.error('Unhandled exception:', exception);
      }
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private isPrismaError(exception: Error): exception is Prisma.PrismaClientKnownRequestError {
    if (!('code' in exception)) {
      return false;
    }
    const code = (exception as Record<string, unknown>).code;
    return typeof code === 'string' && code.startsWith('P');
  }
}
