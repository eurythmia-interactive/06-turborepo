import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvitationController } from './invitation.controller.js';
import { InvitationService } from './invitation.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('InvitationController', () => {
  let controller: InvitationController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      createInvitation: vi.fn(),
      getInvitations: vi.fn(),
      resendInvitation: vi.fn(),
      cancelInvitation: vi.fn(),
    };

    controller = new InvitationController(mockService as InvitationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.createInvitation with correct parameters', async () => {
      const mockReq = {
        user: { userId: 'admin-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      const mockInvitation = {
        id: 'inv-123',
        email: 'user@example.com',
        tenantId: 'tenant-456',
        role: 'MEMBER',
        invitedBy: 'admin-123',
        expiresAt: new Date('2026-12-31T23:59:59Z'),
      };

      mockService.createInvitation.mockResolvedValue(mockInvitation);

      const result = await controller.create(
        {
          email: 'user@example.com',
          tenantId: 'tenant-456',
          role: 'MEMBER',
        },
        mockReq,
      );

      expect(mockService.createInvitation).toHaveBeenCalledWith(
        'user@example.com',
        'tenant-456',
        'MEMBER',
        'admin-123',
        '127.0.0.1',
        'Mozilla/5.0',
      );
      expect(result).toEqual(mockInvitation);
    });
  });

  describe('list', () => {
    it('should call service.getInvitations with query parameters', async () => {
      const mockInvitations = [
        {
          id: 'inv-123',
          email: 'user@example.com',
          tenantId: 'tenant-456',
          role: 'MEMBER',
          status: 'pending',
          expiresAt: new Date('2026-12-31T23:59:59Z'),
        },
      ];

      mockService.getInvitations.mockResolvedValue(mockInvitations);

      const result = await controller.list({ tenantId: 'tenant-456', status: 'pending' });

      expect(mockService.getInvitations).toHaveBeenCalledWith('tenant-456', 'pending');
      expect(result).toEqual(mockInvitations);
    });

    it('should call service.getInvitations without filters', async () => {
      const mockInvitations: any[] = [];

      mockService.getInvitations.mockResolvedValue(mockInvitations);

      const result = await controller.list({});

      expect(mockService.getInvitations).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockInvitations);
    });
  });

  describe('resend', () => {
    it('should call service.resendInvitation with correct parameters', async () => {
      const mockReq = {
        user: { userId: 'admin-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      mockService.resendInvitation.mockResolvedValue({ success: true });

      const result = await controller.resend('inv-123', mockReq);

      expect(mockService.resendInvitation).toHaveBeenCalledWith(
        'inv-123',
        'admin-123',
        '127.0.0.1',
        'Mozilla/5.0',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('cancel', () => {
    it('should call service.cancelInvitation with correct parameters', async () => {
      const mockReq = {
        user: { userId: 'admin-123' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('Mozilla/5.0'),
      } as any;

      mockService.cancelInvitation.mockResolvedValue({ success: true });

      const result = await controller.cancel('inv-123', mockReq);

      expect(mockService.cancelInvitation).toHaveBeenCalledWith(
        'inv-123',
        'admin-123',
        '127.0.0.1',
        'Mozilla/5.0',
      );
      expect(result).toEqual({ success: true });
    });
  });
});
