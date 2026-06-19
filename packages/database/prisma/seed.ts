import { hash } from 'argon2';
import { AuthProviderType, Role, UserStatus, prisma } from '../src/index.ts';

async function main(): Promise<void> {
  const superAdminPassword = await hash('SuperAdmin123!');
  const adminPassword = await hash('Admin123!');
  const memberPassword = await hash('Member123!');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.authenticationProvider.upsert({
    where: {
      type_providerUserId: {
        type: AuthProviderType.LOCAL,
        providerUserId: 'superadmin@example.com',
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      type: AuthProviderType.LOCAL,
      providerUserId: 'superadmin@example.com',
      passwordHash: superAdminPassword,
    },
  });

  await prisma.tenant.upsert({
    where: { slug: 'system' },
    update: {},
    create: {
      name: 'System Tenant',
      slug: 'system',
      isSystem: true,
      users: {
        create: { userId: superAdmin.id },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.authenticationProvider.upsert({
    where: {
      type_providerUserId: {
        type: AuthProviderType.LOCAL,
        providerUserId: 'admin@example.com',
      },
    },
    update: {},
    create: {
      userId: admin.id,
      type: AuthProviderType.LOCAL,
      providerUserId: 'admin@example.com',
      passwordHash: adminPassword,
    },
  });

  await prisma.tenant.upsert({
    where: { slug: 'admin-tenant' },
    update: {},
    create: {
      name: 'Admin Tenant',
      slug: 'admin-tenant',
      users: {
        create: { userId: admin.id },
      },
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      email: 'member@example.com',
      name: 'Member User',
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.authenticationProvider.upsert({
    where: {
      type_providerUserId: {
        type: AuthProviderType.LOCAL,
        providerUserId: 'member@example.com',
      },
    },
    update: {},
    create: {
      userId: member.id,
      type: AuthProviderType.LOCAL,
      providerUserId: 'member@example.com',
      passwordHash: memberPassword,
    },
  });

  await prisma.tenant.upsert({
    where: { slug: 'member-tenant' },
    update: {},
    create: {
      name: 'Member Tenant',
      slug: 'member-tenant',
      users: {
        create: { userId: member.id },
      },
    },
  });

  process.stdout.write('Seeded users:\n');
  process.stdout.write('  superadmin@example.com / SuperAdmin123! (SUPER_ADMIN)\n');
  process.stdout.write('  admin@example.com / Admin123! (ADMIN)\n');
  process.stdout.write('  member@example.com / Member123! (MEMBER)\n');
}

main()
  .catch((err) => {
    process.stderr.write(`Seed failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
