import 'dotenv/config';
import { prisma, AuthProviderType, Role } from '../packages/database/src/index.ts';

const checks: Array<{ name: string; fn: () => Promise<void> }> = [];

function check(name: string, fn: () => Promise<void>): void {
  checks.push({ name, fn });
}

async function run(): Promise<void> {
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of checks) {
    try {
      await fn();
      process.stdout.write(`[PASS] ${name}\n`);
      passed++;
    } catch (err) {
      process.stderr.write(
        `[FAIL] ${name}\n  ${err instanceof Error ? err.message : String(err)}\n`,
      );
      failed++;
    }
  }

  process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

check('DATABASE_URL is set', async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
});

check('Client connects', async () => {
  await prisma.$connect();
});

check('Schema shape (User table exists)', async () => {
  const count = await prisma.user.count();
  if (count < 1) {
    throw new Error(`Expected at least 1 user, got ${count}`);
  }
});

check('Seeded admin exists with correct shape', async () => {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
    include: { providers: true },
  });
  if (!admin) {
    throw new Error('admin@example.com not found');
  }
  if (admin.role !== Role.ADMIN) {
    throw new Error(`Expected role ADMIN, got ${admin.role}`);
  }
  const localProvider = admin.providers.find((p) => p.type === AuthProviderType.LOCAL);
  if (!localProvider) {
    throw new Error('Expected LOCAL AuthenticationProvider for admin');
  }
});

check('RefreshToken CRUD (create → read → delete)', async () => {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: 'admin@example.com' },
  });

  const token = await prisma.refreshToken.create({
    data: {
      userId: admin.id,
      tokenHash: 'verify-test-hash',
      familyId: 'verify-test-family',
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  const found = await prisma.refreshToken.findUnique({
    where: { id: token.id },
  });
  if (!found || found.tokenHash !== 'verify-test-hash') {
    throw new Error('RefreshToken read mismatch');
  }

  await prisma.refreshToken.delete({ where: { id: token.id } });

  const deleted = await prisma.refreshToken.findUnique({
    where: { id: token.id },
  });
  if (deleted) {
    throw new Error('RefreshToken not deleted');
  }
});

check('Client disconnects', async () => {
  await prisma.$disconnect();
});

run();
