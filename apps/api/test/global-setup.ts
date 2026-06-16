process.env.DATABASE_URL =
  'postgresql://turborepo:turborepo@localhost:5432/turborepo_test?schema=public';
process.env.DIRECT_URL =
  'postgresql://turborepo:turborepo@localhost:5432/turborepo_test?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-min-32-chars';
process.env.CORS_ORIGINS = 'http://localhost:3000';

export async function setup() {
  console.log('Setting up test database...');
  const { setupTestDatabase } = await import('./helpers/test-db.js');
  await setupTestDatabase();
  console.log('Test database ready.');
}

export async function teardown() {
  console.log('Tearing down test database...');
  const { cleanTestDatabase, teardownTestDatabase } = await import('./helpers/test-db.js');
  await cleanTestDatabase();
  await teardownTestDatabase();
  console.log('Test database cleaned up.');
}
