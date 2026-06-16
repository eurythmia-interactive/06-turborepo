import { z } from 'zod';

const profileBaseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  image: z.url().nullable(),
});

export const profileUpdateSchema = profileBaseSchema.partial();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const profileResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProfileResponse = z.infer<typeof profileResponseSchema>;
