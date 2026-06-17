import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { Role, UserStatus } from '@repo/database';
import { JwtConfigService } from '../config/jwt-config.service.js';
import type { AccessTokenPayload } from '../interfaces/token-payload.interface.js';

@Injectable()
export class TokenPayloadFactory {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtConfigService: JwtConfigService,
  ) {}

  async signAccessToken(
    userId: string,
    tenantId: string,
    role: Role,
    status: UserStatus,
  ): Promise<string> {
    const config = this.jwtConfigService.get();
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      tenantId,
      role,
      status,
    };

    if (config.algorithm === 'RS256') {
      return this.jwtService.signAsync(payload, {
        expiresIn: config.accessExpiresIn as any,
        algorithm: 'RS256',
        privateKey: config.privateKey,
      });
    }

    return this.jwtService.signAsync(payload, {
      expiresIn: config.accessExpiresIn as any,
    });
  }

  createRefreshTokenData(): { sessionId: string; familyId: string; rawToken: string } {
    return {
      sessionId: randomUUID(),
      familyId: randomUUID(),
      rawToken: JwtConfigService.generateRefreshToken(),
    };
  }

  async signRefreshToken(userId: string, sessionId: string, familyId: string): Promise<string> {
    const config = this.jwtConfigService.get();
    const payload = {
      sub: userId,
      sessionId,
      familyId,
    };

    if (config.algorithm === 'RS256') {
      return this.jwtService.signAsync(payload, {
        expiresIn: config.refreshExpiresIn as any,
        algorithm: 'RS256',
        privateKey: config.privateKey,
      });
    }

    return this.jwtService.signAsync(payload, {
      expiresIn: config.refreshExpiresIn as any,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const config = this.jwtConfigService.get();

    if (config.algorithm === 'RS256') {
      return this.jwtService.verify(token, {
        publicKey: config.publicKey,
        algorithms: ['RS256'],
      });
    }

    return this.jwtService.verify(token);
  }
}
