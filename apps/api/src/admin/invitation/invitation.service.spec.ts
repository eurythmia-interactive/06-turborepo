import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvitationService } from './invitation.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('InvitationService', () => {
  let service: InvitationService;
  let mockPrisma: any;
  let mockEmailService: any;
  let mockAuditService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      userInvitation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn(),
      },
      userTenant: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation((operations) => {
        if (typeof operations === 'function') {
          return operations(mockPrisma);
        }
        return Promise.all(operations);
      }),
    };

    mockEmailService = {
      sendInvitation: vi.fn().mockResolvedValue(true),
    };

    mockAuditService = {
      log: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'WEB_URL') return defaultValue || 'http://localhost:3000';
        return defaultValue;
      }),
    };

    service = new InvitationService(
      mockPrisma as any,
      mockEmailService as any,
      mockAuditService as any,
      mockConfigService as any,
    );
  });

  describe('createInvitation', () => {
    it('should throw ConflictException when user already exists', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.createInvitation(
          'test@example.com',
          'tenant1',
          'MEMBER',
          'admin1',
          '127.0.0.1',
          'Mozilla',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when invitation already pending', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);
      (mockPrisma.userInvitation.findFirst as any).mockResolvedValue({ id: 'existing-invitation' });

      await expect(
        service.createInvitation(
          'test@example.com',
          'tenant1',
          'MEMBER',
          'admin1',
          '127.0.0.1',
          'Mozilla',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should create invitation and send email on success', async () => {
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);
      (mockPrisma.userInvitation.findFirst as any).mockResolvedValue(null);
      (mockPrisma.userInvitation.create as any).mockResolvedValue({
        id: 'inv1',
        email: 'test@example.com',
        token: 'test-token',
        tenantId: 'tenant1',
        role: 'MEMBER',
        invitedBy: 'admin1',
        expiresAt: new Date(),
      });
      (mockPrisma.tenant.findUnique as any).mockResolvedValue({ name: 'Test Tenant' });
      (mockPrisma.user.findUnique as any).mockResolvedValueOnce(null).mockResolvedValueOnce({
        name: 'Admin User',
      });

      const result = await service.createInvitation(
        'test@example.com',
        'tenant1',
        'MEMBER',
        'admin1',
        '127.0.0.1',
        'Mozilla',
      );

      expect(result.id).toBe('inv1');
      expect(mockEmailService.sendInvitation).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId: 'admin1',
        action: 'invitation.created',
        details: { email: 'test@example.com', tenantId: 'tenant1', role: 'MEMBER' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla',
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should throw NotFoundException when invitation not found', async () => {
      (mockPrisma.userInvitation.findUnique as any).mockResolvedValue(null);

      await expect(service.acceptInvitation('invalid-token', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when already accepted', async () => {
      (mockPrisma.userInvitation.findUnique as any).mockResolvedValue({
        id: 'inv1',
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.acceptInvitation('valid-token', 'user1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when expired', async () => {
      (mockPrisma.userInvitation.findUnique as any).mockResolvedValue({
        id: 'inv1',
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 86400000),
      });

      await expect(service.acceptInvitation('valid-token', 'user1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should accept invitation and create user tenant on success', async () => {
      (mockPrisma.userInvitation.findUnique as any).mockResolvedValue({
        id: 'inv1',
        token: 'valid-token',
        tenantId: 'tenant1',
        role: 'MEMBER',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      (mockPrisma.userInvitation.update as any).mockResolvedValue({});
      (mockPrisma.userTenant.create as any).mockResolvedValue({});

      const result = await service.acceptInvitation('valid-token', 'user1');

      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId: 'user1',
        action: 'invitation.accepted',
        details: { invitationId: 'inv1' },
      });
    });
  });

  describe('cancelInvitation', () => {
    it('should throw NotFoundException when invitation not found', async () => {
      (mockPrisma.userInvitation.findUnique as any).mockResolvedValue(null);

      await expect(
        service.cancelInvitation('invalid-id', 'user1', '127.0.0.1', 'Mozilla'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should cancel invitation and log audit on success', async () => {
      (mockPrisma.userInvitation.findUnique as any).mockResolvedValue({
        id: 'inv1',
      });
      (mockPrisma.userInvitation.update as any).mockResolvedValue({});

      const result = await service.cancelInvitation('inv1', 'user1', '127.0.0.1', 'Mozilla');

      expect(result.success).toBe(true);
      expect(mockPrisma.userInvitation.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { expiresAt: expect.any(Date) },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId: 'user1',
        action: 'invitation.canceled',
        details: { invitationId: 'inv1' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla',
      });
    });
  });
});
