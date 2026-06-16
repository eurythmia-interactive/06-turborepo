import { describe, expect, it } from 'vitest';
import { loginSchema } from '../login.schema.js';

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'some-password',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'some-password',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('uses non-revealing error messages', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message.toLowerCase());
      for (const msg of messages) {
        expect(msg).not.toContain('not found');
        expect(msg).not.toContain('does not exist');
        expect(msg).not.toContain('invalid credentials');
      }
    }
  });

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('email');
      expect(paths).toContain('password');
    }
  });
});
