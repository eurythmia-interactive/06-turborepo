import { describe, expect, it } from 'vitest';
import { profileUpdateSchema } from '../profile.schema.js';

describe('profileUpdateSchema', () => {
  it('accepts full update', () => {
    const result = profileUpdateSchema.safeParse({
      name: 'Alice',
      image: 'https://example.com/avatar.png',
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with only name', () => {
    const result = profileUpdateSchema.safeParse({ name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with only image', () => {
    const result = profileUpdateSchema.safeParse({
      image: 'https://example.com/avatar.png',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional via partial)', () => {
    const result = profileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts null image (nullable)', () => {
    const result = profileUpdateSchema.safeParse({ image: null });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL for image', () => {
    const result = profileUpdateSchema.safeParse({ image: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects empty string for name', () => {
    const result = profileUpdateSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const result = profileUpdateSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});
