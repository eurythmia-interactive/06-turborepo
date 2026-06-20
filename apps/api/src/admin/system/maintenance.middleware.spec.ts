import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaintenanceMiddleware } from './maintenance.middleware.js';
import type { Request, Response, NextFunction } from 'express';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('MaintenanceMiddleware', () => {
  let middleware: MaintenanceMiddleware;
  let mockMaintenanceService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockMaintenanceService = {
      getStatus: vi.fn(),
    };

    mockRequest = {
      path: '',
      ip: '127.0.0.1',
      get: vi.fn(),
    } as Partial<Request>;

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as Partial<Response>;

    mockNext = vi.fn();

    middleware = new MaintenanceMiddleware(mockMaintenanceService as any);
  });

  describe('path bypass', () => {
    it('should call next() for /health path', async () => {
      Object.defineProperty(mockRequest, 'path', { value: '/health', writable: true });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockMaintenanceService.getStatus).not.toHaveBeenCalled();
    });

    it('should call next() for /api/v1/admin/* paths', async () => {
      Object.defineProperty(mockRequest, 'path', { value: '/api/v1/admin/users', writable: true });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockMaintenanceService.getStatus).not.toHaveBeenCalled();
    });

    it('should call next() for /api/v1/auth/* paths', async () => {
      Object.defineProperty(mockRequest, 'path', { value: '/api/v1/auth/login', writable: true });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockMaintenanceService.getStatus).not.toHaveBeenCalled();
    });
  });

  describe('SUPER_ADMIN bypass', () => {
    it('should call next() for SUPER_ADMIN users', async () => {
      Object.defineProperty(mockRequest, 'path', { value: '/api/v1/dashboard', writable: true });
      (mockRequest as any).user = { role: 'SUPER_ADMIN' };

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockMaintenanceService.getStatus).not.toHaveBeenCalled();
    });
  });

  describe('maintenance active', () => {
    it('should return 503 when maintenance is enabled', async () => {
      Object.defineProperty(mockRequest, 'path', { value: '/api/v1/dashboard', writable: true });
      (mockRequest as any).user = { role: 'MEMBER' };
      mockMaintenanceService.getStatus.mockResolvedValue({
        enabled: true,
        message: 'System maintenance',
        scheduledEnd: '2026-12-31T23:59:59Z',
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Service Unavailable',
        message: 'System maintenance',
        scheduledEnd: '2026-12-31T23:59:59Z',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use default message when not provided', async () => {
      Object.defineProperty(mockRequest, 'path', { value: '/api/v1/dashboard', writable: true });
      (mockRequest as any).user = { role: 'MEMBER' };
      mockMaintenanceService.getStatus.mockResolvedValue({
        enabled: true,
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'System is under maintenance',
        }),
      );
    });
  });

  describe('maintenance disabled', () => {
    it('should call next() when maintenance is disabled', async () => {
      Object.defineProperty(mockRequest, 'path', { value: '/api/v1/dashboard', writable: true });
      (mockRequest as any).user = { role: 'MEMBER' };
      mockMaintenanceService.getStatus.mockResolvedValue({
        enabled: false,
      });

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should call next() when getStatus throws', async () => {
      Object.defineProperty(mockRequest, 'path', { value: '/api/v1/dashboard', writable: true });
      (mockRequest as any).user = { role: 'MEMBER' };
      mockMaintenanceService.getStatus.mockRejectedValue(new Error('DB error'));

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
