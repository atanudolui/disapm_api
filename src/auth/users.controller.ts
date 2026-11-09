import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AdminGuard } from './admin.guard.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; username: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  listUsers() {
    return this.auth.listUsers();
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createUser(@Body() dto: CreateUserDto) {
    return this.auth.createUser(
      dto.username,
      dto.name,
      dto.password,
      dto.role,
    );
  }

  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.auth.updateUser(
      id,
      dto.username,
      dto.name,
      dto.password,
      dto.role,
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  deleteUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.deleteUser(id, request.user.userId);
  }
}
