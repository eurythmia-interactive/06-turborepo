import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, generateKeyPairSync } from 'node:crypto';

export interface JwtConfig {
  secret?: string;
  publicKey?: string;
  privateKey?: string;
  algorithm: 'HS256' | 'RS256';
  issuer: string;
  audience: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

@Injectable()
export class JwtConfigService {
  private readonly config: JwtConfig;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const privateKeyEnv = this.configService.get<string>('JWT_PRIVATE_KEY');
    const publicKeyEnv = this.configService.get<string>('JWT_PUBLIC_KEY');

    if (nodeEnv === 'production' && privateKeyEnv && publicKeyEnv) {
      this.config = {
        privateKey: Buffer.from(privateKeyEnv, 'base64').toString('utf-8'),
        publicKey: Buffer.from(publicKeyEnv, 'base64').toString('utf-8'),
        algorithm: 'RS256',
        issuer: this.configService.get<string>('JWT_ISSUER', 'turborepo-api'),
        audience: this.configService.get<string>('JWT_AUDIENCE', 'turborepo-client'),
        accessExpiresIn: this.configService.get<string>('JWT_EXPIRES_IN_ACCESS', '15m'),
        refreshExpiresIn: this.configService.get<string>('JWT_EXPIRES_IN_REFRESH', '7d'),
      };
    } else {
      this.config = {
        secret: this.configService.get<string>('JWT_SECRET'),
        algorithm: 'HS256',
        issuer: this.configService.get<string>('JWT_ISSUER', 'turborepo-api'),
        audience: this.configService.get<string>('JWT_AUDIENCE', 'turborepo-client'),
        accessExpiresIn: this.configService.get<string>('JWT_EXPIRES_IN_ACCESS', '15m'),
        refreshExpiresIn: this.configService.get<string>('JWT_EXPIRES_IN_REFRESH', '7d'),
      };
    }
  }

  get(): JwtConfig {
    return { ...this.config };
  }

  getSignOptions() {
    const base = {
      issuer: this.config.issuer,
      audience: this.config.audience,
    };

    if (this.config.algorithm === 'RS256') {
      return {
        ...base,
        algorithm: 'RS256' as const,
        privateKey: this.config.privateKey,
      };
    }

    return {
      ...base,
      algorithm: 'HS256' as const,
      secret: this.config.secret,
    };
  }

  getVerifyOptions() {
    const base = {
      issuer: this.config.issuer,
      audience: this.config.audience,
    };

    if (this.config.algorithm === 'RS256') {
      return {
        ...base,
        algorithms: ['RS256'] as const,
        publicKey: this.config.publicKey,
      };
    }

    return {
      ...base,
      algorithms: ['HS256'] as const,
      secret: this.config.secret,
    };
  }

  static generateKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { privateKey, publicKey };
  }

  static generateRefreshToken(): string {
    return `${randomBytes(32).toString('hex')}`;
  }
}
