import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; username: string };
}

const ACCESS_COOKIE = 'access_token';
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto.username, dto.password);
    this.setAccessCookie(response, result.accessToken);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(ACCESS_COOKIE, this.cookieOptions());
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.auth.getProfile(request.user.userId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      request.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  private setAccessCookie(response: Response, token: string) {
    response.cookie(ACCESS_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: ACCESS_TOKEN_TTL_MS,
    });
  }

  private cookieOptions() {
    // The UI and API are on different origins, so the browser only sends the
    // cookie on cross-site fetches when it is SameSite=None (which needs Secure).
    const secure =
      this.config.get('NODE_ENV') === 'production' ||
      !!this.config.get('RAILWAY_ENVIRONMENT_ID');
    return {
      httpOnly: true,
      secure,
      sameSite: secure ? ('none' as const) : ('lax' as const),
      path: '/',
    };
  }
}
