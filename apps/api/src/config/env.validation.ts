import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_EXPIRES_IN_ACCESS: z.string().default('15m'),
  JWT_EXPIRES_IN_REFRESH: z.string().default('7d'),
  JWT_ISSUER: z.string().default('turborepo-api'),
  JWT_AUDIENCE: z.string().default('turborepo-client'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  CORS_ORIGINS: z.string().transform((val) => val.split(',').map((s) => s.trim())),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@example.com'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('Environment validation failed:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Environment validation failed. See above for details.');
  }

  return result.data;
}
