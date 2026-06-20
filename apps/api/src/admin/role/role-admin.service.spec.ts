import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RoleAdminService } from './role-admin.service.js';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('RoleAdminService', () => {
  let service: RoleAdminService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockCacheService: any;

  beforeEach(() => {
    mockPrisma = {
      customRole: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        updateMany: vi.fn(),
      },
      userTenant: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn((fn) => fn(mockPrisma)),
    };

    mockAuditService = {
      log: vi.fn(),
    };

    mockCacheService = {
      invalidateRole: vi.fn(),
      invalidateUser: vi.fn(),
      invalidateAll: vi.fn(),
    };

    service = new RoleAdminService(
      mockPrisma as any,
      mockAuditService as any,
      mockCacheService as any,
    );
  });

  describe('findAll', () => {
    it('should return paginated roles', async () => {
      const roles = [
        {
          id: '1',
          name: 'Editor',
          description: 'Can edit content',
          permissions: ['user:read'],
          isSystem: false,
          createdAt: new Date(),
          _count: { users: 5, userTenants: 3 },
        },
      ];

      (mockPrisma.customRole.findMany as any).mockResolvedValue(roles);
      (mockPrisma.customRole.count as any).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Editor');
      expect(result.data[0]!.userCount).toBe(8);
      expect(result.meta.total).toBe(1);
    });

    it('should exclude system roles by default', async () => {
      (mockPrisma.customRole.findMany as any).mockResolvedValue([]);
      (mockPrisma.customRole.count as any).mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 });

      expect(mockPrisma.customRole.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isSystem: false },
        }),
      );
    });

    it('should include system roles when requested', async () => {
      (mockPrisma.customRole.findMany as any).mockResolvedValue([]);
      (mockPrisma.customRole.count as any).mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, includeSystem: true });

      expect(mockPrisma.customRole.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should search by name and description', async () => {
      (mockPrisma.customRole.findMany as any).mockResolvedValue([]);
      (mockPrisma.customRole.count as any).mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'editor' });

      expect(mockPrisma.customRole.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'editor', mode: 'insensitive' } },
              { description: { contains: 'editor', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return role details', async () => {
      const role = {
        id: '1',
        name: 'Editor',
        description: 'Can edit',
        permissions: ['user:read'],
        isSystem: false,
        createdAt: new Date(),
        _count: { users: 2, userTenants: 1 },
        users: [{ id: 'u1', name: 'John', email: 'john@test.com' }],
        userTenants: [],
      };

      (mockPrisma.customRole.findUnique as any).mockResolvedValue(role);

      const result = await service.findById('1');

      expect(result.id).toBe('1');
      expect(result.name).toBe('Editor');
      expect(result.userCount).toBe(3);
    });

    it('should throw NotFoundException when role not found', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new role', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue(null);
      (mockPrisma.customRole.create as any).mockResolvedValue({
        id: '1',
        name: 'Editor',
        description: 'Can edit',
        permissions: ['user:read'],
        isSystem: false,
        createdAt: new Date(),
      });

      const result = await service.create(
        { name: 'Editor', description: 'Can edit', permissions: ['user:read'] },
        'admin-1',
      );

      expect(result.name).toBe('Editor');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'role.created' }),
      );
    });

    it('should throw ConflictException for duplicate name', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue({ id: '1', name: 'Editor' });

      await expect(
        service.create({ name: 'Editor', permissions: ['user:read'] }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for invalid permissions', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue(null);

      await expect(
        service.create({ name: 'Editor', permissions: ['invalid:perm'] }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update role', async () => {
      (mockPrisma.customRole.findUnique as any)
        .mockResolvedValueOnce({
          id: '1',
          name: 'Editor',
          permissions: ['user:read'],
          isSystem: false,
        })
        .mockResolvedValueOnce(null);
      (mockPrisma.customRole.update as any).mockResolvedValue({
        id: '1',
        name: 'Senior Editor',
        description: 'Updated',
        permissions: ['user:read', 'user:write'],
        isSystem: false,
        createdAt: new Date(),
      });

      const result = await service.update(
        '1',
        { name: 'Senior Editor', permissions: ['user:read', 'user:write'] },
        'admin-1',
      );

      expect(result.name).toBe('Senior Editor');
      expect(mockCacheService.invalidateRole).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when role not found', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue(null);

      await expect(service.update('1', { name: 'New' }, 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate name', async () => {
      (mockPrisma.customRole.findUnique as any)
        .mockResolvedValueOnce({ id: '1', name: 'Editor' })
        .mockResolvedValueOnce({ id: '2', name: 'Writer' });

      await expect(service.update('1', { name: 'Writer' }, 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('delete', () => {
    it('should delete role without users', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue({
        id: '1',
        name: 'Editor',
        isSystem: false,
        _count: { users: 0, userTenants: 0 },
      });
      (mockPrisma.customRole.delete as any).mockResolvedValue({});

      const result = await service.delete('1', {}, 'admin-1');

      expect(result.success).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'role.deleted' }),
      );
    });

    it('should throw ForbiddenException for system role', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue({
        id: '1',
        name: 'ADMIN',
        isSystem: true,
        _count: { users: 0, userTenants: 0 },
      });

      await expect(service.delete('1', {}, 'admin-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnprocessableEntityException when role has users and no reassign', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue({
        id: '1',
        name: 'Editor',
        isSystem: false,
        _count: { users: 5, userTenants: 0 },
      });

      await expect(service.delete('1', {}, 'admin-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should reassign users when reassignTo is provided', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue({
        id: '1',
        name: 'Editor',
        isSystem: false,
        _count: { users: 5, userTenants: 0 },
      });
      (mockPrisma.customRole.delete as any).mockResolvedValue({});

      await service.delete('1', { reassignTo: '2' }, 'admin-1');

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { customRoleId: '1' },
        data: { customRoleId: '2' },
      });
    });
  });

  describe('assignPermissions', () => {
    it('should assign permissions to role', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue({
        id: '1',
        name: 'Editor',
        permissions: ['user:read'],
      });
      (mockPrisma.customRole.update as any).mockResolvedValue({
        id: '1',
        name: 'Editor',
        permissions: ['user:read', 'user:write'],
      });

      const result = await service.assignPermissions('1', ['user:read', 'user:write'], 'admin-1');

      expect(result.permissions).toEqual(['user:read', 'user:write']);
      expect(mockCacheService.invalidateRole).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when role not found', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue(null);

      await expect(service.assignPermissions('1', ['user:read'], 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for invalid permissions', async () => {
      (mockPrisma.customRole.findUnique as any).mockResolvedValue({
        id: '1',
        name: 'Editor',
      });

      await expect(service.assignPermissions('1', ['invalid:perm'], 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
