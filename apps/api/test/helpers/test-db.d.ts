import { type PrismaClient } from '@repo/database';
export declare function setupTestDatabase(): Promise<{
    connectionString: string;
    prisma: PrismaClient;
}>;
export declare function teardownTestDatabase(): Promise<void>;
export declare function cleanTestDatabase(): Promise<void>;
export declare function getTestPrismaClient(): Promise<PrismaClient>;
//# sourceMappingURL=test-db.d.ts.map