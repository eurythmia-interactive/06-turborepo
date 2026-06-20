import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaintenanceService } from './maintenance.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let mockPrisma: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockPrisma = {
      systemConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    mockAuditService = {
      log: vi.fn(),
    };

    service = new MaintenanceService(mockPrisma as any, mockAuditService as any);
  });

  describe('getStatus', () => {
    it('should return disabled status when no config exists', async () => {
      (mockPrisma.systemConfig.findUnique as any).mockResolvedValue(null);

      const result = await service.getStatus();

      expect(result.enabled).toBe(false);
      expect(result.message).toBeUndefined();
      expect(result.scheduledEnd).toBeUndefined();
    });

    it('should return enabled status from config', async () => {
      (mockPrisma.systemConfig.findUnique as any).mockResolvedValue({
        value: {
          enabled: true,
          message: 'Under maintenance',
          scheduledEnd: '2026-12-31T23:59:59Z',
        },
      });

      const result = await service.getStatus();

      expect(result.enabled).toBe(true);
      expect(result.message).toBe('Under maintenance');
      expect(result.scheduledEnd).toBe('2026-12-31T23:59:59Z');
    });

    it('should cache the status', async () => {
      (mockPrisma.systemConfig.findUnique as any).mockResolvedValue({
        value: { enabled: false },
      });

      await service.getStatus();
      await service.getStatus();

      expect(mockPrisma.systemConfig.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('enable', () => {
    it('should create maintenance config and log audit', async () => {
      (mockPrisma.systemConfig.upsert as any).mockResolvedValue({});

      await service.enable('Test message', '2026-12-31T23:59:59Z', 'user1', '127.0.0.1', 'Mozilla');

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'maintenance_mode' },
        update: {
          value: {
            enabled: true,
            message: 'Test message',
            scheduledEnd: '2026-12-31T23:59:59Z',
          },
          updatedBy: 'user1',
        },
        create: {
          key: 'maintenance_mode',
          value: {
            enabled: true,
            message: 'Test message',
            scheduledEnd: '2026-12-31T23:59:59Z',
          },
          description: 'Maintenance mode configuration',
          updatedBy: 'user1',
        },
      });

      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId: 'user1',
        action: 'system.maintenance_on',
        details: { message: 'Test message', scheduledEnd: '2026-12-31T23:59:59Z' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla',
      });
    });

    it('should use default message when none provided', async () => {
      (mockPrisma.systemConfig.upsert as any).mockResolvedValue({});

      await service.enable(undefined, undefined, 'user1', undefined, undefined);

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            value: {
              enabled: true,
              message: 'System is under maintenance',
              scheduledEnd: null,
            },
            updatedBy: 'user1',
          },
        }),
      );
    });
  });

  describe('disable', () => {
    it('should update maintenance config and log audit', async () => {
      (mockPrisma.systemConfig.upsert as any).mockResolvedValue({});

      await service.disable('user1', '127.0.0.1', 'Mozilla');

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'maintenance_mode' },
        update: {
          value: { enabled: false },
          updatedBy: 'user1',
        },
        create: {
          key: 'maintenance_mode',
          value: { enabled: false },
          description: 'Maintenance mode configuration',
          updatedBy: 'user1',
        },
      });

      expect(mockAuditService.log).toHaveBeenCalledWith({
        userId: 'user1',
        action: 'system.maintenance_off',
        ip: '127.0.0.1',
        userAgent: 'Mozilla',
      });
    });
  });

  describe('isActive', () => {
    it('should return false when maintenance is disabled', async () => {
      (mockPrisma.systemConfig.findUnique as any).mockResolvedValue({
        value: { enabled: false },
      });

      const result = await service.isActive();
      expect(result).toBe(false);
    });

    it('should return true when maintenance is enabled', async () => {
      (mockPrisma.systemConfig.findUnique as any).mockResolvedValue({
        value: { enabled: true },
      });

      const result = await service.isActive();
      expect(result).toBe(true);
    });
  });
});
