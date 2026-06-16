import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './global-exception.filter.js';
import { ValidationException } from '../exceptions/validation.exception.js';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let configService: ConfigService;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    configService = {
      get: vi.fn(),
    } as unknown as ConfigService;

    filter = new GlobalExceptionFilter(configService);

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockRequest = {
      url: '/test/path',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('should map ValidationException to 400 with error details', () => {
    const errors = { email: ['Invalid email'] };
    const exception = new ValidationException(errors);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        errors,
        path: '/test/path',
      }),
    );
  });

  it('should include timestamp in error response', () => {
    const exception = new Error('Test error');

    filter.catch(exception, mockHost);

    const response = mockResponse.json.mock.calls[0][0];
    expect(response.timestamp).toBeDefined();
    expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
  });

  it('should map HttpException to correct status code', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not found',
      }),
    );
  });

  it('should extract message from HttpException object response', () => {
    const exception = new HttpException(
      { message: 'Custom error', details: 'extra' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Custom error',
      }),
    );
  });

  it('should map Prisma P2002 (unique constraint) to 409', () => {
    const exception = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Resource already exists',
      }),
    );
  });

  it('should map Prisma P2025 (not found) to 404', () => {
    const exception = Object.assign(new Error('Not found'), {
      code: 'P2025',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Resource not found',
      }),
    );
  });

  it('should map Prisma P2003 (FK violation) to 409', () => {
    const exception = Object.assign(new Error('FK violation'), {
      code: 'P2003',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Foreign key constraint failed',
      }),
    );
  });

  it('should map unknown Prisma errors to generic database error', () => {
    const exception = Object.assign(new Error('Unknown Prisma error'), {
      code: 'P9999',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Database error',
      }),
    );
  });

  it('should return 500 for unknown errors', () => {
    const exception = new Error('Unknown error');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('should log unknown errors in development mode', () => {
    vi.spyOn(configService, 'get').mockReturnValue('development');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const exception = new Error('Test error');
    filter.catch(exception, mockHost);

    expect(consoleSpy).toHaveBeenCalledWith('Unhandled exception:', exception);
    consoleSpy.mockRestore();
  });

  it('should not log unknown errors in production mode', () => {
    vi.spyOn(configService, 'get').mockReturnValue('production');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const exception = new Error('Test error');
    filter.catch(exception, mockHost);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should include path from request URL', () => {
    mockRequest.url = '/api/users/123';
    const exception = new Error('Test error');

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/users/123',
      }),
    );
  });

  it('should handle non-Error exceptions', () => {
    const exception = 'string error';

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('should handle null exceptions', () => {
    filter.catch(null, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should handle undefined exceptions', () => {
    filter.catch(undefined, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });
});
