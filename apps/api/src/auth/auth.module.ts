import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtConfigService } from './config/jwt-config.service.js';
import { TokenPayloadFactory } from './utilities/token-payload.factory.js';
import { AdminModule } from '../admin/admin.module.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
    forwardRef(() => AdminModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtConfigService, TokenPayloadFactory],
  exports: [AuthService, JwtConfigService, TokenPayloadFactory],
})
export class AuthModule {}
