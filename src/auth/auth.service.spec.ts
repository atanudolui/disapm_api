import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { compare, hash } from 'bcryptjs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service.js';
import { User } from './user.entity.js';

describe('AuthService', () => {
  const users = {
    findOneBy: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn((user) => user),
    save: vi.fn(),
    delete: vi.fn(),
  };
  const jwt = { signAsync: vi.fn() };
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jwt.signAsync.mockResolvedValue('signed-jwt');
  });

  it('creates a normalized user and stores only a password hash', async () => {
    users.findOneBy.mockResolvedValue(null);
    users.save.mockImplementation(async (user) => ({
      ...user,
      id: 'user-id',
      role: user.role ?? 'user',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));

    const result = await service.createUser(
      ' FieldAdmin ',
      'Field Admin',
      'password123',
    );
    const savedUser = users.save.mock.calls[0][0];

    expect(result).toEqual({
      id: 'user-id',
      username: 'fieldadmin',
      name: 'Field Admin',
      role: 'user',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    expect(savedUser.username).toBe('fieldadmin');
    expect(savedUser.name).toBe('Field Admin');
    expect(savedUser.passwordHash).not.toBe('password123');
    await expect(compare('password123', savedUser.passwordHash)).resolves.toBe(true);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects passwords that exceed bcrypt byte limits', async () => {
    await expect(
      service.createUser(
        'fieldadmin',
        'Field Admin',
        '🔐'.repeat(19),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate usernames without regard to case', async () => {
    users.findOneBy.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.createUser(
        'FIELDADMIN',
        'Field Admin',
        'password123',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('signs the JWT with the username and user ID', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'user-id',
      username: 'fieldadmin',
      name: 'Field Admin',
      role: 'admin',
      passwordHash: await hash('password123', 4),
    });

    await service.login('fieldadmin', 'password123');

    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'user-id', username: 'fieldadmin' },
    );
  });

  it('does not authenticate an unknown username', async () => {
    users.findOneBy.mockResolvedValue(null);

    await expect(
      service.login('missing-user', 'password123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('authenticates a matching password and returns a JWT', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'user-id',
      username: 'fieldadmin',
      name: 'Field Admin',
      role: 'admin',
      passwordHash: await hash('password123', 4),
    });

    await expect(
      service.login('FIELDADMIN', 'password123'),
    ).resolves.toEqual({
      user: {
        id: 'user-id',
        username: 'fieldadmin',
        name: 'Field Admin',
        role: 'admin',
      },
      accessToken: 'signed-jwt',
    });
  });

  it('lists users without password hashes', async () => {
    const listedUsers = [{
      id: 'user-id',
      username: 'fieldadmin',
      name: 'Field Admin',
      role: 'user',
    }];
    users.find.mockResolvedValue(listedUsers);

    await expect(service.listUsers()).resolves.toBe(listedUsers);
    expect(users.find).toHaveBeenCalledWith(
      {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        order: { createdAt: 'DESC' },
      },
    );
  });

  it('updates username and name and hashes an optional replacement password', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'user-id',
      username: 'oldname',
      name: 'Old Name',
      role: 'user',
      passwordHash: 'old-hash',
    });
    users.save.mockImplementation(async (user) => ({
      ...user,
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    }));

    await expect(
      service.updateUser(
        'user-id',
        ' NewName ',
        'New Name',
        'new-password',
        'admin',
      ),
    ).resolves.toMatchObject({
      username: 'newname',
      name: 'New Name',
      role: 'admin',
    });
    const savedUser = users.save.mock.calls[0][0];
    expect(savedUser.role).toBe('admin');
    expect(savedUser.passwordHash).not.toBe('old-hash');
    await expect(compare('new-password', savedUser.passwordHash)).resolves.toBe(
      true,
    );
  });

  it('prevents deleting the signed-in user', async () => {
    await expect(
      service.deleteUser('user-id', 'user-id'),
    ).rejects.toMatchObject({ status: 403 });
    expect(users.delete).not.toHaveBeenCalled();
  });

  it('deletes another user', async () => {
    users.delete.mockResolvedValue({ affected: 1 });

    await expect(
      service.deleteUser('other-user', 'user-id'),
    ).resolves.toEqual({ success: true });
    expect(users.delete).toHaveBeenCalledWith({ id: 'other-user' });
  });
});
