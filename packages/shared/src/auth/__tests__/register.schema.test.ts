import { describe, expect, it } from 'vitest';
import { registerSchema } from '../register.schema.js';

const validInput = {
  email: 'user@example.com',
  password: 'Str0ng!Pass',
  confirmPassword: 'Str0ng!Pass',
};

describe('registerSchema', () => {
  it('accepts valid full registration', () => {
    const result = registerSchema.safeParse({ ...validInput, name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('accepts valid minimal registration (no name)', () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: 'Ab1!',
      confirmPassword: 'Ab1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password longer than 128 characters', () => {
    const long = 'Aa1!' + 'x'.repeat(125);
    const result = registerSchema.safeParse({
      ...validInput,
      password: long,
      confirmPassword: long,
    });
    expect(result.success).toBe(false);
  });

  it('rejects password missing uppercase', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: 'str0ng!pass',
      confirmPassword: 'str0ng!pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password missing lowercase', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: 'STR0NG!PASS',
      confirmPassword: 'STR0NG!PASS',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password missing digit', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: 'Strong!Pass',
      confirmPassword: 'Strong!Pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password missing special character', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: 'Str0ngPass1',
      confirmPassword: 'Str0ngPass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      confirmPassword: 'Different!1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('rejects empty body with field-level errors', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('email');
      expect(paths).toContain('password');
      expect(paths).toContain('confirmPassword');
    }
  });
});
