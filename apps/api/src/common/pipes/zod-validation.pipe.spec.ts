import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';
import { ValidationException } from '../exceptions/validation.exception.js';

describe('ZodValidationPipe', () => {
  const testSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });

  it('should return value unchanged when no schema provided', () => {
    const pipe = new ZodValidationPipe();
    const value = { email: 'test@example.com', password: 'password123' };
    const metadata = { type: 'body' as const, metatype: Object };

    const result = pipe.transform(value, metadata);

    expect(result).toEqual(value);
  });

  it('should parse value successfully with valid schema', () => {
    const pipe = new ZodValidationPipe(testSchema);
    const value = { email: 'test@example.com', password: 'password123' };
    const metadata = { type: 'body' as const, metatype: Object };

    const result = pipe.transform(value, metadata);

    expect(result).toEqual(value);
  });

  it('should throw ValidationException with structured errors on invalid data', () => {
    const pipe = new ZodValidationPipe(testSchema);
    const value = { email: 'invalid', password: 'short' };
    const metadata = { type: 'body' as const, metatype: Object };

    expect(() => pipe.transform(value, metadata)).toThrow(ValidationException);
  });

  it('should map errors to correct field paths', () => {
    const pipe = new ZodValidationPipe(testSchema);
    const value = { email: 'invalid', password: 'short' };
    const metadata = { type: 'body' as const, metatype: Object };

    try {
      pipe.transform(value, metadata);
      expect.fail('Should have thrown ValidationException');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      const validationError = error as ValidationException;

      expect(validationError.errors).toHaveProperty('email');
      expect(validationError.errors).toHaveProperty('password');
      expect(validationError.errors.email).toContain('Invalid email');
      expect(validationError.errors.password).toContain('Password must be at least 8 characters');
    }
  });

  it('should group multiple errors per field into arrays', () => {
    const strictSchema = z.object({
      password: z
        .string()
        .min(8, 'Too short')
        .regex(/[A-Z]/, 'Must contain uppercase')
        .regex(/[0-9]/, 'Must contain digit'),
    });

    const pipe = new ZodValidationPipe(strictSchema);
    const value = { password: 'weak' };
    const metadata = { type: 'body' as const, metatype: Object };

    try {
      pipe.transform(value, metadata);
      expect.fail('Should have thrown ValidationException');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      const validationError = error as ValidationException;

      expect(validationError.errors.password).toHaveLength(3);
      expect(validationError.errors.password).toContain('Too short');
      expect(validationError.errors.password).toContain('Must contain uppercase');
      expect(validationError.errors.password).toContain('Must contain digit');
    }
  });

  it('should handle nested object paths with dot notation', () => {
    const nestedSchema = z.object({
      user: z.object({
        email: z.string().email('Invalid email'),
        address: z.object({
          city: z.string().min(1, 'City is required'),
        }),
      }),
    });

    const pipe = new ZodValidationPipe(nestedSchema);
    const value = {
      user: { email: 'invalid', address: { city: '' } },
    };
    const metadata = { type: 'body' as const, metatype: Object };

    try {
      pipe.transform(value, metadata);
      expect.fail('Should have thrown ValidationException');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      const validationError = error as ValidationException;

      expect(validationError.errors).toHaveProperty('user.email');
      expect(validationError.errors).toHaveProperty('user.address.city');
    }
  });

  it('should handle root-level errors', () => {
    const refineSchema = z
      .object({
        password: z.string(),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
      });

    const pipe = new ZodValidationPipe(refineSchema);
    const value = { password: 'pass1', confirmPassword: 'pass2' };
    const metadata = { type: 'body' as const, metatype: Object };

    try {
      pipe.transform(value, metadata);
      expect.fail('Should have thrown ValidationException');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      const validationError = error as ValidationException;

      expect(validationError.errors).toHaveProperty('root');
      expect(validationError.errors.root).toContain('Passwords do not match');
    }
  });

  it('should strip unknown properties when schema is strict', () => {
    const strictSchema = z
      .object({
        email: z.string().email(),
      })
      .strict();

    const pipe = new ZodValidationPipe(strictSchema);
    const value = { email: 'test@example.com', extra: 'field' };
    const metadata = { type: 'body' as const, metatype: Object };

    expect(() => pipe.transform(value, metadata)).toThrow(ValidationException);
  });

  it('should transform data according to schema', () => {
    const transformSchema = z.object({
      age: z.string().transform((val) => parseInt(val, 10)),
    });

    const pipe = new ZodValidationPipe(transformSchema);
    const value = { age: '25' };
    const metadata = { type: 'body' as const, metatype: Object };

    const result = pipe.transform(value, metadata);

    expect(result).toEqual({ age: 25 });
  });
});
