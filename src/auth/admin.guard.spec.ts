import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminGuard } from './admin.guard.js';
import { User } from './user.entity.js';

describe('AdminGuard', () => {
  const users = { findOne: vi.fn() };
  let guard: AdminGuard;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminGuard,
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();
    guard = moduleRef.get(AdminGuard);
  });

  function createContext() {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 'user-id', username: 'test-admin' },
        }),
      }),
    } as never;
  }

  it('allows administrators', async () => {
    users.findOne.mockResolvedValue({ id: 'user-id', role: 'admin' });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('rejects regular users', async () => {
    users.findOne.mockResolvedValue({ id: 'user-id', role: 'user' });

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects tokens for deleted users', async () => {
    users.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
