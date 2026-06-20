import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MaintenanceToggle } from '@/components/admin/maintenance-toggle';

vi.mock('@/actions/maintenance', () => ({
  getMaintenanceStatusAction: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { enabled: false, message: null, scheduledEnd: null },
    }),
  ),
  enableMaintenanceAction: vi.fn(() => Promise.resolve({ success: true })),
  disableMaintenanceAction: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MaintenanceToggle', () => {
  it('renders enable button when maintenance is disabled', async () => {
    render(<MaintenanceToggle />);

    await waitFor(() => {
      expect(screen.getByText('Enable Maintenance')).toBeInTheDocument();
    });
  });

  it('renders warning alert when maintenance is enabled', async () => {
    const { getMaintenanceStatusAction } = await import('@/actions/maintenance');
    vi.mocked(getMaintenanceStatusAction).mockResolvedValueOnce({
      success: true,
      data: {
        enabled: true,
        message: 'System under maintenance',
        scheduledEnd: '2026-12-31T23:59:59Z',
      },
    });

    render(<MaintenanceToggle />);

    await waitFor(() => {
      expect(screen.getByText(/System under maintenance/i)).toBeInTheDocument();
      expect(screen.getByText(/Disable/i)).toBeInTheDocument();
    });
  });

  it('shows scheduled end time when set', async () => {
    const { getMaintenanceStatusAction } = await import('@/actions/maintenance');
    vi.mocked(getMaintenanceStatusAction).mockResolvedValueOnce({
      success: true,
      data: {
        enabled: true,
        message: 'Maintenance',
        scheduledEnd: '2026-12-31T23:59:59Z',
      },
    });

    render(<MaintenanceToggle />);

    await waitFor(() => {
      expect(screen.getByText(/Expected to end at/i)).toBeInTheDocument();
    });
  });
});
