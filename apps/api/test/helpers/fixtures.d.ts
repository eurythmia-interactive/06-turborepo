import { PrismaClient, Role, UserStatus, AuthProviderType } from '@repo/database';
export interface TestUser {
    id: string;
    email: string;
    name: string | null;
    status: UserStatus;
    role: Role;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserOptions {
    email?: string;
    name?: string;
    role?: Role;
    status?: UserStatus;
    passwordHash?: string;
    authProviderType?: AuthProviderType;
}
export declare function createTestUser(prisma: PrismaClient, options?: CreateUserOptions): Promise<TestUser>;
export declare function createTestRefreshToken(prisma: PrismaClient, userId: string, options?: {
    tokenHash?: string;
    familyId?: string;
    revoked?: boolean;
    expiresAt?: Date;
}): Promise<string>;
//# sourceMappingURL=fixtures.d.ts.map