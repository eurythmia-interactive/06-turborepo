import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@repo/database', () => ({
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN', MEMBER: 'MEMBER', GUEST: 'GUEST' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' },
}));

describe('EmailService', () => {
  let mockConfigService: any;
  let consoleSpy: any;

  beforeEach(() => {
    vi.resetModules();
    mockConfigService = {
      get: vi.fn(),
    };
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('without RESEND_API_KEY', () => {
    it('should log to console when sending email', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'RESEND_API_KEY') return undefined;
        if (key === 'EMAIL_FROM') return defaultValue || 'noreply@example.com';
        return defaultValue;
      });

      const { EmailService } = await import('./email.service.js');
      const service = new EmailService(mockConfigService);

      const result = await service.send('test@example.com', 'Test Subject', '<p>Test</p>');

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log invitation email to console', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'RESEND_API_KEY') return undefined;
        if (key === 'EMAIL_FROM') return defaultValue || 'noreply@example.com';
        if (key === 'WEB_URL') return 'http://localhost:3000';
        return defaultValue;
      });

      const { EmailService } = await import('./email.service.js');
      const service = new EmailService(mockConfigService);

      const result = await service.sendInvitation(
        'test@example.com',
        'http://localhost:3000/invite/token123',
        'Test Tenant',
        'Admin User',
      );

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log welcome email to console', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'RESEND_API_KEY') return undefined;
        if (key === 'EMAIL_FROM') return defaultValue || 'noreply@example.com';
        return defaultValue;
      });

      const { EmailService } = await import('./email.service.js');
      const service = new EmailService(mockConfigService);

      const result = await service.sendWelcome('test@example.com', 'Test User');

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('with RESEND_API_KEY', () => {
    it('should use Resend client when API key is provided', async () => {
      const mockSend = vi.fn().mockResolvedValue({ id: 'email-id' });
      vi.doMock('resend', () => ({
        Resend: class {
          emails = { send: mockSend };
        },
      }));

      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'RESEND_API_KEY') return 're_test_key';
        if (key === 'EMAIL_FROM') return 'test@example.com';
        return defaultValue;
      });

      const { EmailService } = await import('./email.service.js');
      const service = new EmailService(mockConfigService);

      const result = await service.send('test@example.com', 'Test', '<p>Body</p>');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Body</p>',
      });

      vi.doUnmock('resend');
    });

    it('should return false and log error when Resend fails', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('Resend API error'));
      vi.doMock('resend', () => ({
        Resend: class {
          emails = { send: mockSend };
        },
      }));

      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'RESEND_API_KEY') return 're_test_key';
        if (key === 'EMAIL_FROM') return 'test@example.com';
        return defaultValue;
      });

      const { EmailService } = await import('./email.service.js');
      const service = new EmailService(mockConfigService);

      const result = await service.send('test@example.com', 'Test', '<p>Body</p>');

      expect(result).toBe(false);

      vi.doUnmock('resend');
    });
  });

  describe('template rendering', () => {
    it('should render invitation template with correct values', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'RESEND_API_KEY') return undefined;
        if (key === 'EMAIL_FROM') return 'noreply@example.com';
        if (key === 'WEB_URL') return 'http://localhost:3000';
        return defaultValue;
      });

      const { EmailService } = await import('./email.service.js');
      const service = new EmailService(mockConfigService);

      await service.sendInvitation(
        'invite@example.com',
        'http://localhost:3000/invite/abc123',
        'Acme Corp',
        'John Admin',
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('invite@example.com'));
    });

    it('should render welcome template with user name', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'RESEND_API_KEY') return undefined;
        if (key === 'EMAIL_FROM') return 'noreply@example.com';
        return defaultValue;
      });

      const { EmailService } = await import('./email.service.js');
      const service = new EmailService(mockConfigService);

      await service.sendWelcome('user@example.com', 'Jane Doe');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
    });
  });
});
