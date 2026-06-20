import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaintenanceController } from './maintenance.controller.js';
import { MaintenanceService } from './maintenance.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('MaintenanceController', () => {
  let controller: MaintenanceController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      enable: vi.fn(),
      disable: vi.fn(),
      getStatus: vi.fn(),
    };

    controller = new MaintenanceController(mockService as MaintenanceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('enable', () => {
    it('should call service.enable with correct parameters', async () => {
      const mockReq = {
        user: { userId: 'user-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      mockService.enable.mockResolvedValue(undefined);

      await controller.enable(
        { message: 'System maintenance', scheduledEnd: '2026-12-31T23:59:59Z' },
        mockReq,
      );

      expect(mockService.enable).toHaveBeenCalledWith(
        'System maintenance',
        '2026-12-31T23:59:59Z',
        'user-123',
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });

    it('should return success object', async () => {
      const mockReq = {
        user: { userId: 'user-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      mockService.enable.mockResolvedValue(undefined);

      const result = await controller.enable({ message: 'Maintenance' }, mockReq);

      expect(result).toEqual({ success: true });
    });
  });

  describe('disable', () => {
    it('should call service.disable with correct parameters', async () => {
      const mockReq = {
        user: { userId: 'user-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      mockService.disable.mockResolvedValue(undefined);

      await controller.disable(mockReq);

      expect(mockService.disable).toHaveBeenCalledWith('user-123', '127.0.0.1', 'Mozilla/5.0');
    });

    it('should return success object', async () => {
      const mockReq = {
        user: { userId: 'user-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      mockService.disable.mockResolvedValue(undefined);

      const result = await controller.disable(mockReq);

      expect(result).toEqual({ success: true });
    });
  });

  describe('getStatus', () => {
    it('should call service.getStatus', async () => {
      const mockStatus = {
        enabled: true,
        message: 'System maintenance',
        scheduledEnd: '2026-12-31T23:59:59Z',
      };

      mockService.getStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus();

      expect(mockService.getStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });

    it('should return disabled status when maintenance is off', async () => {
      const mockStatus = {
        enabled: false,
      };

      mockService.getStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus();

      expect(result).toEqual(mockStatus);
    });
  });
});
