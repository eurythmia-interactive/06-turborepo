import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestLoggerMiddleware } from './request-logger.middleware.js';
import { LoggerService } from '../logger/logger.service.js';
import type { Request, Response, NextFunction } from 'express';

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;
  let loggerService: LoggerService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    loggerService = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as LoggerService;

    middleware = new RequestLoggerMiddleware(loggerService);

    mockRequest = {
      headers: {},
      method: 'GET',
      path: '/test/path',
    };

    mockResponse = {
      on: vi.fn(),
      getHeader: vi.fn(),
      statusCode: 200,
    };

    mockNext = vi.fn();
  });

  it('should generate UUID trace ID when not present in header', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.headers?.['x-trace-id']).toBeDefined();
    expect(typeof mockRequest.headers?.['x-trace-id']).toBe('string');
    expect((mockRequest.headers?.['x-trace-id'] as string).length).toBeGreaterThan(0);
  });

  it('should preserve existing trace ID from header', () => {
    const existingTraceId = 'existing-trace-id-12345';
    mockRequest.headers = { 'x-trace-id': existingTraceId };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.headers?.['x-trace-id']).toBe(existingTraceId);
  });

  it('should attach trace ID to request headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.headers).toHaveProperty('x-trace-id');
  });

  it('should register finish event listener on response', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should call next() to continue middleware chain', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should log request completion with correct data', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    const finishCallback = (mockResponse.on as any).mock.calls[0][1];
    mockResponse.statusCode = 200;
    (mockResponse.getHeader as any).mockReturnValue('1234');

    finishCallback();

    expect(loggerService.log).toHaveBeenCalledWith(
      'request completed',
      expect.objectContaining({
        traceId: mockRequest.headers?.['x-trace-id'],
        method: 'GET',
        path: '/test/path',
        status: 200,
        contentLength: 1234,
      }),
    );
  });

  it('should include duration in log entry', () => {
    vi.useFakeTimers();

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    const finishCallback = (mockResponse.on as any).mock.calls[0][1];
    vi.advanceTimersByTime(100);
    (mockResponse.getHeader as any).mockReturnValue(undefined);

    finishCallback();

    expect(loggerService.log).toHaveBeenCalledWith(
      'request completed',
      expect.objectContaining({
        duration: expect.any(Number),
      }),
    );

    vi.useRealTimers();
  });

  it('should handle missing content-length header', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    const finishCallback = (mockResponse.on as any).mock.calls[0][1];
    (mockResponse.getHeader as any).mockReturnValue(undefined);

    finishCallback();

    expect(loggerService.log).toHaveBeenCalledWith(
      'request completed',
      expect.objectContaining({
        contentLength: undefined,
      }),
    );
  });

  it('should handle POST requests', () => {
    (mockRequest as any).method = 'POST';
    (mockRequest as any).path = '/api/users';

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    const finishCallback = (mockResponse.on as any).mock.calls[0][1];
    mockResponse.statusCode = 201;
    (mockResponse.getHeader as any).mockReturnValue('567');

    finishCallback();

    expect(loggerService.log).toHaveBeenCalledWith(
      'request completed',
      expect.objectContaining({
        method: 'POST',
        path: '/api/users',
        status: 201,
      }),
    );
  });

  it('should handle error status codes', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    const finishCallback = (mockResponse.on as any).mock.calls[0][1];
    mockResponse.statusCode = 500;
    (mockResponse.getHeader as any).mockReturnValue('0');

    finishCallback();

    expect(loggerService.log).toHaveBeenCalledWith(
      'request completed',
      expect.objectContaining({
        status: 500,
      }),
    );
  });

  it('should generate unique trace IDs for different requests', () => {
    const traceIds: string[] = [];

    for (let i = 0; i < 5; i++) {
      const req: Partial<Request> = { headers: {}, method: 'GET', path: '/test' };
      const res: Partial<Response> = { on: vi.fn(), getHeader: vi.fn() };
      const next = vi.fn();

      middleware.use(req as Request, res as Response, next);

      traceIds.push(req.headers?.['x-trace-id'] as string);
    }

    const uniqueIds = new Set(traceIds);
    expect(uniqueIds.size).toBe(5);
  });

  it('should convert content-length to number', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    const finishCallback = (mockResponse.on as any).mock.calls[0][1];
    (mockResponse.getHeader as any).mockReturnValue('9999');

    finishCallback();

    const logCall = (loggerService.log as any).mock.calls[0];
    expect(typeof logCall[1].contentLength).toBe('number');
    expect(logCall[1].contentLength).toBe(9999);
  });
});
