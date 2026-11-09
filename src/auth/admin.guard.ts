import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; username: string };
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.users.findOne({
      where: { id: request.user.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }
    if (user.role !== 'admin') {
      throw new ForbiddenException('Administrator access is required.');
    }

    return true;
  }
}
