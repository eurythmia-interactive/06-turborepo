import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMaintenanceStatusAction,
  enableMaintenanceAction,
  disableMaintenanceAction,
} from '@/actions/maintenance';

vi.mock('@/lib/server-api-client', () => ({
  serverApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { serverApiClient } from '@/lib/server-api-client';

const mockGet = vi.mocked(serverApiClient.get);
const mockPost = vi.mocked(serverApiClient.post);

describe('Maintenance Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMaintenanceStatusAction', () => {
    it('returns success with status data', async () => {
      const mockStatus = {
        enabled: true,
        message: 'System maintenance',
        scheduledEnd: '2026-12-31T23:59:59Z',
      };

      mockGet.mockResolvedValue(mockStatus);

      const result = await getMaintenanceStatusAction();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatus);
      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/system/maintenance/status');
    });

    it('returns error message on failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await getMaintenanceStatusAction();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  describe('enableMaintenanceAction', () => {
    it('returns success when enabled', async () => {
      mockPost.mockResolvedValue({ success: true });

      const result = await enableMaintenanceAction({
        message: 'Scheduled maintenance',
        scheduledEnd: '2026-12-31T23:59:59Z',
      });

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/system/maintenance/enable', {
        message: 'Scheduled maintenance',
        scheduledEnd: '2026-12-31T23:59:59Z',
      });
    });

    it('validates input with zod schema', async () => {
      const result = await enableMaintenanceAction({
        message: 'x'.repeat(501),
      });

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('returns error message on failure', async () => {
      mockPost.mockRejectedValue(new Error('Failed to enable'));

      const result = await enableMaintenanceAction({ message: 'Maintenance' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to enable');
    });
  });

  describe('disableMaintenanceAction', () => {
    it('returns success when disabled', async () => {
      mockPost.mockResolvedValue({ success: true });

      const result = await disableMaintenanceAction();

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/system/maintenance/disable');
    });

    it('returns error message on failure', async () => {
      mockPost.mockRejectedValue(new Error('Failed to disable'));

      const result = await disableMaintenanceAction();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to disable');
    });
  });
});
