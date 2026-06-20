import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpersonationController } from './impersonation.controller.js';
import { ImpersonationService } from './impersonation.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('ImpersonationController', () => {
  let controller: ImpersonationController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      startImpersonation: vi.fn(),
      stopImpersonation: vi.fn(),
      getStatus: vi.fn(),
    };

    controller = new ImpersonationController(mockService as ImpersonationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('start', () => {
    it('should call service.startImpersonation with correct parameters', async () => {
      const mockReq = {
        user: { userId: 'admin-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      const mockToken = {
        accessToken: 'mock-token',
        expiresAt: new Date('2026-12-31T23:59:59Z'),
      };

      mockService.startImpersonation.mockResolvedValue(mockToken);

      const result = await controller.start(
        { userId: 'user-456', reason: 'Support request' },
        mockReq,
      );

      expect(mockService.startImpersonation).toHaveBeenCalledWith(
        'admin-123',
        'user-456',
        'Support request',
        '127.0.0.1',
        'Mozilla/5.0',
      );
      expect(result).toEqual(mockToken);
    });
  });

  describe('stop', () => {
    it('should call service.stopImpersonation with correct parameters', async () => {
      const mockReq = {
        user: { userId: 'admin-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      mockService.stopImpersonation.mockResolvedValue({ success: true });

      const result = await controller.stop(mockReq);

      expect(mockService.stopImpersonation).toHaveBeenCalledWith(
        'admin-123',
        '127.0.0.1',
        'Mozilla/5.0',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getStatus', () => {
    it('should call service.getStatus with admin userId', async () => {
      const mockReq = {
        user: { userId: 'admin-123' },
      } as any;

      const mockStatus = {
        isImpersonating: true,
        targetUserId: 'user-456',
        expiresAt: new Date('2026-12-31T23:59:59Z'),
      };

      mockService.getStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus(mockReq);

      expect(mockService.getStatus).toHaveBeenCalledWith('admin-123');
      expect(result).toEqual(mockStatus);
    });

    it('should return not impersonating status', async () => {
      const mockReq = {
        user: { userId: 'admin-123' },
      } as any;

      const mockStatus = {
        isImpersonating: false,
      };

      mockService.getStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus(mockReq);

      expect(result).toEqual(mockStatus);
    });
  });
});
