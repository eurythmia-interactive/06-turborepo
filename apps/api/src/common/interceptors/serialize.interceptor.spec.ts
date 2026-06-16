import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { z } from 'zod';
import { firstValueFrom, of } from 'rxjs';
import { SerializeInterceptor } from './serialize.interceptor.js';

describe('SerializeInterceptor', () => {
  let interceptor: SerializeInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new SerializeInterceptor(reflector);
  });

  const createMockContext = (handler: (...args: unknown[]) => unknown) => ({
    getHandler: () => handler,
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({}),
    }),
  });

  const createMockCallHandler = (data: unknown) => ({
    handle: () => of(data),
  });

  it('should return data unchanged when no response schema found', async () => {
    const handler = function testHandler() {};
    vi.spyOn(reflector, 'get').mockReturnValue(undefined);

    const data = { id: '1', email: 'test@example.com', passwordHash: 'secret' };
    const context = createMockContext(handler);
    const next = createMockCallHandler(data);

    const result = await firstValueFrom(interceptor.intercept(context as any, next));

    expect(result).toEqual(data);
  });

  it('should strip fields not in schema', async () => {
    const responseSchema = z.object({
      id: z.string(),
      email: z.string(),
    });

    const handler = function testHandler() {};
    vi.spyOn(reflector, 'get').mockReturnValue(responseSchema);

    const data = { id: '1', email: 'test@example.com', passwordHash: 'secret', internal: 'data' };
    const context = createMockContext(handler);
    const next = createMockCallHandler(data);

    const result = await firstValueFrom(interceptor.intercept(context as any, next));

    expect(result).toEqual({ id: '1', email: 'test@example.com' });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('internal');
  });

  it('should transform data according to schema', async () => {
    const responseSchema = z.object({
      id: z.string(),
      createdAt: z.date().transform((d) => d.toISOString()),
    });

    const handler = function testHandler() {};
    vi.spyOn(reflector, 'get').mockReturnValue(responseSchema);

    const date = new Date('2024-01-01T00:00:00.000Z');
    const data = { id: '1', createdAt: date };
    const context = createMockContext(handler);
    const next = createMockCallHandler(data);

    const result = await firstValueFrom(interceptor.intercept(context as any, next));

    expect(result).toEqual({ id: '1', createdAt: '2024-01-01T00:00:00.000Z' });
  });

  it('should log warning when serialization fails but return original data', async () => {
    const responseSchema = z.object({
      id: z.string(),
      email: z.string().email(),
    });

    const handler = function testHandler() {};
    vi.spyOn(reflector, 'get').mockReturnValue(responseSchema);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const data = { id: '1', email: 'invalid-email' };
    const context = createMockContext(handler);
    const next = createMockCallHandler(data);

    const result = await firstValueFrom(interceptor.intercept(context as any, next));

    expect(result).toEqual(data);
    expect(consoleSpy).toHaveBeenCalledWith('Response serialization failed:', expect.any(Array));
    consoleSpy.mockRestore();
  });

  it('should handle nullable fields correctly', async () => {
    const responseSchema = z.object({
      id: z.string(),
      name: z.string().nullable(),
    });

    const handler = function testHandler() {};
    vi.spyOn(reflector, 'get').mockReturnValue(responseSchema);

    const data = { id: '1', name: null };
    const context = createMockContext(handler);
    const next = createMockCallHandler(data);

    const result = await firstValueFrom(interceptor.intercept(context as any, next));

    expect(result).toEqual({ id: '1', name: null });
  });

  it('should handle optional fields', async () => {
    const responseSchema = z.object({
      id: z.string(),
      name: z.string().optional(),
    });

    const handler = function testHandler() {};
    vi.spyOn(reflector, 'get').mockReturnValue(responseSchema);

    const data = { id: '1' };
    const context = createMockContext(handler);
    const next = createMockCallHandler(data);

    const result = await firstValueFrom(interceptor.intercept(context as any, next));

    expect(result).toEqual({ id: '1' });
  });

  it('should handle array responses', async () => {
    const responseSchema = z.array(
      z.object({
        id: z.string(),
        email: z.string(),
      }),
    );

    const handler = function testHandler() {};
    vi.spyOn(reflector, 'get').mockReturnValue(responseSchema);

    const data = [
      { id: '1', email: 'user1@example.com', password: 'secret1' },
      { id: '2', email: 'user2@example.com', password: 'secret2' },
    ];
    const context = createMockContext(handler);
    const next = createMockCallHandler(data);

    const result = await firstValueFrom(interceptor.intercept(context as any, next));

    expect(result).toEqual([
      { id: '1', email: 'user1@example.com' },
      { id: '2', email: 'user2@example.com' },
    ]);
  });

  it('should handle nested object responses', async () => {
    const responseSchema = z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
      }),
      metadata: z.object({
        createdAt: z.string(),
      }),
    });

    const handler = function testHandler() {};
    vi.spyOn(reflector, 'get').mockReturnValue(responseSchema);

    const data = {
      user: { id: '1', email: 'test@example.com', password: 'secret' },
      metadata: { createdAt: '2024-01-01', internal: 'data' },
    };
    const context = createMockContext(handler);
    const next = createMockCallHandler(data);

    const result = await firstValueFrom(interceptor.intercept(context as any, next));

    expect(result).toEqual({
      user: { id: '1', email: 'test@example.com' },
      metadata: { createdAt: '2024-01-01' },
    });
  });
});
