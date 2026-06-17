import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
});

function validateClientEnv() {
  const result = clientSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid client environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Invalid client environment variables. See above for details.');
  }
  return result.data;
}

export const clientEnv = validateClientEnv();
