import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { LoginInput, RegisterInput, ProfileUpdateInput } from '@repo/shared';
import { loginSchema, registerSchema, profileUpdateSchema } from '@repo/shared';
import { AuthService } from './auth.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
} from './utilities/cookie.utility.js';
import { JwtConfigService } from './config/jwt-config.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtConfigService: JwtConfigService,
  ) {}

  private get cookieConfig() {
    return {
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body.email, body.password);
    setRefreshTokenCookie(response, result.refreshToken, this.cookieConfig);
    return {
      accessToken: result.accessToken,
      user: result.user,
      tenants: result.tenants,
    };
  }

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(body);
    setRefreshTokenCookie(response, result.refreshToken, this.cookieConfig);
    return {
      accessToken: result.accessToken,
      user: result.user,
      tenants: result.tenants,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const rawToken = getRefreshTokenFromCookie(request.cookies);
    if (!rawToken) {
      return response.status(401).json({ statusCode: 401, message: 'Missing refresh token' });
    }
    const tokens = await this.authService.refreshTokens(rawToken);
    setRefreshTokenCookie(response, tokens.refreshToken, this.cookieConfig);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const rawToken = getRefreshTokenFromCookie(request.cookies);
    if (rawToken) {
      await this.authService.logout(rawToken);
    }
    clearRefreshTokenCookie(response);
    return { message: 'Logged out successfully' };
  }

  @Post('select-tenant/:tenantId')
  @HttpCode(HttpStatus.OK)
  async selectTenant(@CurrentUser('userId') userId: string, @Param('tenantId') tenantId: string) {
    return this.authService.selectTenant(userId, tenantId);
  }

  @Get('profile')
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body(new ZodValidationPipe(profileUpdateSchema)) body: ProfileUpdateInput,
  ) {
    return this.authService.updateProfile(userId, body);
  }
}
