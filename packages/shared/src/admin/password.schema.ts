import { z } from 'zod';

export const adminPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one digit')
  .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character');

export type AdminPasswordInput = z.infer<typeof adminPasswordSchema>;
