import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ValidationException } from './validation.exception.js';

describe('ValidationException', () => {
  it('should create an exception with structured errors', () => {
    const errors = {
      email: ['Invalid email address'],
      password: ['Password must be at least 8 characters', 'Password must contain a digit'],
    };

    const exception = new ValidationException(errors);

    expect(exception.errors).toEqual(errors);
  });

  it('should extend BadRequestException', () => {
    const errors = { field: ['error'] };
    const exception = new ValidationException(errors);

    expect(exception).toBeInstanceOf(BadRequestException);
  });

  it('should set status code to 400', () => {
    const errors = { field: ['error'] };
    const exception = new ValidationException(errors);

    expect(exception.getStatus()).toBe(400);
  });

  it('should include structured response in exception', () => {
    const errors = {
      email: ['Required'],
    };

    const exception = new ValidationException(errors);
    const response = exception.getResponse() as Record<string, unknown>;

    expect(response.statusCode).toBe(400);
    expect(response.message).toBe('Validation failed');
    expect(response.errors).toEqual(errors);
  });

  it('should handle empty errors object', () => {
    const exception = new ValidationException({});

    expect(exception.errors).toEqual({});
  });

  it('should handle nested field paths', () => {
    const errors = {
      'user.email': ['Invalid email'],
      'user.address.city': ['City is required'],
    };

    const exception = new ValidationException(errors);

    expect(exception.errors).toEqual(errors);
  });
});
