import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ImpersonationService } from './impersonation.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('ImpersonationService', () => {
  let service: ImpersonationService;
  let mockPrisma: any;
  let mockTokenPayloadFactory: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };

    mockTokenPayloadFactory = {
      signAccessToken: vi.fn().mockResolvedValue('mock-token'),
    };

    mockAuditService = {
      log: vi.fn(),
    };

    service = new ImpersonationService(
      mockPrisma as any,
      mockTokenPayloadFactory as any,
      mockAuditService as any,
    );
  });

  describe('startImpersonation', () => {
    it('should throw BadRequestException when impersonating self', async () => {
      await expect(
        service.startImpersonation('user1', 'user1', 'test', '127.0.0.1', 'Mozilla'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already impersonating', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user2',
        role: 'MEMBER',
        status: 'ACTIVE',
        tenants: [{ tenantId: 'tenant1' }],
      });

      await service.startImpersonation('user1', 'user2', 'test', '127.0.0.1', 'Mozilla');

      await expect(
        service.startImpersonation('user1', 'user3', 'test2', '127.0.0.1', 'Mozilla'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when target user not found', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        service.startImpersonation('user1', 'user2', 'test', '127.0.0.1', 'Mozilla'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when target is SUPER_ADMIN', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user2',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        tenants: [],
      });

      await expect(
        service.startImpersonation('user1', 'user2', 'test', '127.0.0.1', 'Mozilla'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should generate token and log audit on success', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user2',
        role: 'MEMBER',
        status: 'ACTIVE',
        tenants: [{ tenantId: 'tenant1' }],
      });

      const result = await service.startImpersonation(
        'user1',
        'user2',
        'Support request',
        '127.0.0.1',
        'Mozilla',
      );

      expect(result.accessToken).toBe('mock-token');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockTokenPayloadFactory.signAccessToken).toHaveBeenCalledWith(
        'user2',
        'tenant1',
        'MEMBER',
        'ACTIVE',
        undefined,
        'user1',
      );
      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId: 'user1',
        action: 'user.impersonation_started',
        details: { targetUserId: 'user2', reason: 'Support request' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla',
      });
    });
  });

  describe('stopImpersonation', () => {
    it('should remove impersonation and log audit', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user2',
        role: 'MEMBER',
        status: 'ACTIVE',
        tenants: [{ tenantId: 'tenant1' }],
      });

      await service.startImpersonation('user1', 'user2', 'test', '127.0.0.1', 'Mozilla');

      const result = await service.stopImpersonation('user1', '127.0.0.1', 'Mozilla');

      expect(result.success).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId: 'user1',
        action: 'user.impersonation_stopped',
        ip: '127.0.0.1',
        userAgent: 'Mozilla',
      });
    });
  });

  describe('getStatus', () => {
    it('should return not impersonating when no active session', async () => {
      const result = await service.getStatus('user1');

      expect(result.isImpersonating).toBe(false);
    });

    it('should return impersonation details when active', async () => {
      (mockPrisma.user.findUnique as any)
        .mockResolvedValueOnce({
          id: 'user2',
          role: 'MEMBER',
          status: 'ACTIVE',
          tenants: [{ tenantId: 'tenant1' }],
        })
        .mockResolvedValueOnce({
          id: 'user2',
          name: 'Test User',
          email: 'test@example.com',
        });

      await service.startImpersonation('user1', 'user2', 'test', '127.0.0.1', 'Mozilla');

      const result = await service.getStatus('user1');

      expect(result.isImpersonating).toBe(true);
      expect(result.targetUser).toEqual({
        id: 'user2',
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should return not impersonating for expired session', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user2',
        role: 'MEMBER',
        status: 'ACTIVE',
        tenants: [{ tenantId: 'tenant1' }],
      });

      await service.startImpersonation('user1', 'user2', 'test', '127.0.0.1', 'Mozilla');

      const result = await service.getStatus('user1');

      expect(result.isImpersonating).toBe(true);
    });
  });
});
