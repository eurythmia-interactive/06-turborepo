import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const isDev = process.env.NODE_ENV !== 'production';
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    connectionTimeoutMillis: Number(process.env.DATABASE_POOL_TIMEOUT_MS ?? 10_000),
  });
  return new PrismaClient({
    adapter,
    log: isDev ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (isDev) {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient } from './generated/prisma/client.js';
export { Prisma } from './generated/prisma/client.js';
export { AuthProviderType, Role, UserStatus } from './generated/prisma/enums.js';
export type { AuthenticationProvider, RefreshToken, User } from './generated/prisma/client.js';
