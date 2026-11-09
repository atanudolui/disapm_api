import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { User, type UserRole } from './user.entity.js';

const BCRYPT_COST = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async createUser(
    username: string,
    name: string,
    password: string,
    role: UserRole = 'user',
  ) {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!normalizedUsername || !normalizedName) {
      throw new BadRequestException('Username and name are required.');
    }

    const existingUsername = await this.users.findOneBy({
      username: normalizedUsername,
    });
    if (existingUsername) {
      throw new ConflictException('This username is already in use.');
    }

    const passwordHash = await this.hashPassword(password);
    let user: {
      id: string;
      username: string;
      name: string;
      role: UserRole;
      createdAt: Date;
    };
    try {
      const savedUser = await this.users.save(
        this.users.create({
          id: randomUUID(),
          username: normalizedUsername,
          name: normalizedName,
          passwordHash,
          role,
        }),
      );
      user = {
        id: savedUser.id,
        username: savedUser.username,
        name: savedUser.name,
        role: savedUser.role,
        createdAt: savedUser.createdAt,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflictForUniqueViolation(error);
      }
      throw error;
    }

    return user;
  }

  async login(username: string, password: string) {
    const normalizedUsername = username.trim().toLowerCase();
    const user = await this.users.findOneBy({ username: normalizedUsername });

    if (
      !user ||
      Buffer.byteLength(password, 'utf8') > 72 ||
      !(await compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      accessToken: await this.signToken(user.id, user.username),
    };
  }

  async getProfile(userId: string) {
    const user = await this.users.findOne({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }
    return user;
  }

  listUsers() {
    return this.users.find({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async updateUser(
    id: string,
    username: string | undefined,
    name: string | undefined,
    password: string | undefined,
    role: UserRole | undefined,
  ) {
    if (
      username === undefined &&
      name === undefined &&
      password === undefined &&
      role === undefined
    ) {
      throw new BadRequestException(
        'Provide a username, name, password, or role to update.',
      );
    }

    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (username !== undefined) {
      const normalizedUsername = username.trim().toLowerCase();
      if (!normalizedUsername) {
        throw new BadRequestException('Username is required.');
      }
      user.username = normalizedUsername;
    }

    if (name !== undefined) {
      const normalizedName = name.trim();
      if (!normalizedName) {
        throw new BadRequestException('Name is required.');
      }
      user.name = normalizedName;
    }

    if (password !== undefined) {
      user.passwordHash = await this.hashPassword(password);
    }

    if (role !== undefined) {
      user.role = role;
    }

    try {
      const savedUser = await this.users.save(user);
      return {
        id: savedUser.id,
        username: savedUser.username,
        name: savedUser.name,
        role: savedUser.role,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflictForUniqueViolation(error);
      }
      throw error;
    }
  }

  async deleteUser(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const result = await this.users.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('User not found.');
    }
    return { success: true };
  }

  private async hashPassword(password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException('Password exceeds the supported length.');
    }
    return hash(password, BCRYPT_COST);
  }

  private signToken(userId: string, username: string) {
    return this.jwt.signAsync({ sub: userId, username });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}

function conflictForUniqueViolation(error: unknown): ConflictException {
  const constraint =
    error instanceof QueryFailedError
      ? (error.driverError as { constraint?: string }).constraint
      : undefined;
  return constraint === 'UQ_users_username'
    ? new ConflictException('This username is already in use.')
    : new ConflictException('An account with this username already exists.');
}
