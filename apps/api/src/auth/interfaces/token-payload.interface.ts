import type { Role, UserStatus } from '@repo/database';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: Role;
  status: UserStatus;
  customRoleId?: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  familyId: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: Role;
  status: UserStatus;
  customRoleId?: string;
}
