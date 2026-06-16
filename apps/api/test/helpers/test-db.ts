import { prisma, type PrismaClient } from '@repo/database';

export async function setupTestDatabase(): Promise<{
  connectionString: string;
  prisma: PrismaClient;
}> {
  await prisma.$connect();
  return { connectionString: process.env.DATABASE_URL!, prisma };
}

export async function teardownTestDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export async function cleanTestDatabase(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.authenticationProvider.deleteMany();
  await prisma.user.deleteMany();
}

export async function getTestPrismaClient(): Promise<PrismaClient> {
  return prisma;
}
