import { AuthProviderType, Role, UserStatus, prisma } from '../src/index.ts';

async function main(): Promise<void> {
  const adminEmail = 'admin@example.com';
  const adminProviderId = adminEmail;

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Default Admin',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.authenticationProvider.upsert({
    where: {
      type_providerUserId: {
        type: AuthProviderType.LOCAL,
        providerUserId: adminProviderId,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      type: AuthProviderType.LOCAL,
      providerUserId: adminProviderId,
      passwordHash: 'dev-only-placeholder-replace-in-auth-chapter',
    },
  });

  process.stdout.write(`Seeded admin user: ${admin.email}\n`);
}

main()
  .catch((err) => {
    process.stderr.write(`Seed failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
