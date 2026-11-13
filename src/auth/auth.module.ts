import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { User } from './user.entity.js';
import { UsersController } from './users.controller.js';
import { AdminGuard } from './admin.guard.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, JwtStrategy, AdminGuard],
})
export class AuthModule {}
