import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { AuthProviderType, type PrismaClient, Role, UserStatus } from '@repo/database';
import { PRISMA_CLIENT } from '../database/database.module.js';
import { TokenPayloadFactory } from './utilities/token-payload.factory.js';
import { JwtConfigService } from './config/jwt-config.service.js';
import type { RegisterInput, ProfileUpdateInput } from '@repo/shared';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  tenants: Array<{ id: string; name: string; slug: string }>;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly tokenPayloadFactory: TokenPayloadFactory,
    private readonly jwtConfigService: JwtConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const provider = await this.prisma.authenticationProvider.findFirst({
      where: {
        type: AuthProviderType.LOCAL,
        providerUserId: email.toLowerCase(),
      },
      include: {
        user: {
          include: {
            tenants: {
              include: { tenant: true },
            },
          },
        },
      },
    });

    if (!provider || !provider.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await verify(provider.passwordHash, password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { user } = provider;

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    const tenants = user.tenants.map(
      (ut: { tenant: { id: string; name: string; slug: string } }) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
      }),
    );

    const defaultTenantId = tenants[0]?.id ?? 'none';

    const accessToken = await this.tokenPayloadFactory.signAccessToken(
      user.id,
      defaultTenantId,
      user.role,
      user.status,
      user.customRoleId ?? undefined,
    );

    const refreshData = this.tokenPayloadFactory.createRefreshTokenData();
    const tokenHash = this.hashToken(refreshData.rawToken);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshData.sessionId,
        userId: user.id,
        tokenHash,
        familyId: refreshData.familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;

    if (isAdmin) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          tenantId: defaultTenantId === 'none' ? null : defaultTenantId,
          action: 'admin.login',
          details: {
            email: user.email,
            role: user.role,
            success: true,
          },
          ip: ipAddress,
          userAgent,
        },
      });
    }

    return {
      accessToken,
      refreshToken: refreshData.rawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenants,
    };
  }

  async register(input: RegisterInput): Promise<LoginResult> {
    const existing = await this.prisma.authenticationProvider.findFirst({
      where: {
        type: AuthProviderType.LOCAL,
        providerUserId: input.email.toLowerCase(),
      },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hash(input.password);

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name ?? null,
        status: UserStatus.ACTIVE,
        role: Role.MEMBER,
        providers: {
          create: {
            type: AuthProviderType.LOCAL,
            providerUserId: input.email.toLowerCase(),
            passwordHash,
          },
        },
      },
      include: {
        tenants: {
          include: { tenant: true },
        },
      },
    });

    const tenants = user.tenants.map(
      (ut: { tenant: { id: string; name: string; slug: string } }) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        slug: ut.tenant.slug,
      }),
    );

    const defaultTenantId = tenants[0]?.id ?? 'none';

    const accessToken = await this.tokenPayloadFactory.signAccessToken(
      user.id,
      defaultTenantId,
      user.role,
      user.status,
    );

    const refreshData = this.tokenPayloadFactory.createRefreshTokenData();
    const tokenHash = this.hashToken(refreshData.rawToken);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshData.sessionId,
        userId: user.id,
        tokenHash,
        familyId: refreshData.familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: refreshData.rawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenants,
    };
  }

  async refreshTokens(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
        replaces: true,
      },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.revoked) {
      const familyId = existingToken.replaces?.familyId ?? existingToken.familyId;
      await this.revokeTokenFamily(familyId);
      throw new UnauthorizedException('Token reuse detected — session revoked');
    }

    if (existingToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const newSessionId = randomUUID();
    const newFamilyId = existingToken.familyId;
    const newRawToken = JwtConfigService.generateRefreshToken();
    const newTokenHash = this.hashToken(newRawToken);

    await this.prisma.refreshToken
      .update({
        where: { id: existingToken.id },
        data: {
          revoked: true,
          replacedBy: {
            connect: { id: newSessionId },
          },
        },
      })
      .catch(async () => {
        await this.prisma.refreshToken.update({
          where: { id: existingToken.id },
          data: { revoked: true },
        });
      });

    await this.prisma.refreshToken.create({
      data: {
        id: newSessionId,
        userId: existingToken.userId,
        tokenHash: newTokenHash,
        familyId: newFamilyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const user = existingToken.user;
    const membership = await this.prisma.userTenant.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    const tenantId = membership?.tenantId ?? 'none';

    const accessToken = await this.tokenPayloadFactory.signAccessToken(
      user.id,
      tenantId,
      user.role,
      user.status,
      user.customRoleId ?? undefined,
    );

    return {
      accessToken,
      refreshToken: newRawToken,
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (token) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revoked: true },
      });
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateProfile(userId: string, input: ProfileUpdateInput) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.image !== undefined && { image: input.image }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async selectTenant(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === Role.SUPER_ADMIN) {
      const accessToken = await this.tokenPayloadFactory.signAccessToken(
        user.id,
        tenantId,
        user.role,
        user.status,
        user.customRoleId ?? undefined,
      );
      return { accessToken };
    }

    const membership = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('User does not belong to this tenant');
    }

    const accessToken = await this.tokenPayloadFactory.signAccessToken(
      user.id,
      tenantId,
      user.role,
      user.status,
      user.customRoleId ?? undefined,
    );

    return { accessToken };
  }

  private async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId },
      data: { revoked: true },
    });
  }
}
