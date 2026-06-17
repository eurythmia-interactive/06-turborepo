export const HEALTH_CHECK = 'ok' as const;

export type HealthStatus = typeof HEALTH_CHECK;

export interface ApiResponse<T> {
  data: T;
  status: HealthStatus;
  timestamp: string;
}

export const createResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  status: HEALTH_CHECK,
  timestamp: new Date().toISOString(),
});

export {
  loginSchema,
  loginResponseSchema,
  type LoginInput,
  type LoginResponse,
} from './auth/login.schema';
export {
  profileUpdateSchema,
  profileResponseSchema,
  type ProfileUpdateInput,
  type ProfileResponse,
} from './auth/profile.schema';
export {
  registerSchema,
  registerResponseSchema,
  type RegisterInput,
  type RegisterResponse,
} from './auth/register.schema';
