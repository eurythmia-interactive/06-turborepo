import { describe, expectTypeOf, it } from 'vitest';
import type { LoginInput, ProfileUpdateInput, RegisterInput } from '../../index.js';

describe('inferred types', () => {
  it('RegisterInput has correct shape', () => {
    expectTypeOf<RegisterInput>().toEqualTypeOf<{
      email: string;
      name?: string | undefined;
      password: string;
      confirmPassword: string;
    }>();
  });

  it('LoginInput has correct shape', () => {
    expectTypeOf<LoginInput>().toEqualTypeOf<{
      email: string;
      password: string;
    }>();
  });

  it('ProfileUpdateInput has correct shape', () => {
    expectTypeOf<ProfileUpdateInput>().toEqualTypeOf<{
      name?: string | undefined;
      image?: string | null | undefined;
    }>();
  });
});
