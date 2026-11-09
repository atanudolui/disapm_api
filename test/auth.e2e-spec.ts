import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../src/auth/user.entity.js';
import { App } from 'supertest/types.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  'Authentication and user API (e2e)',
  () => {
    let app: INestApplication<App>;
    const username = `auth-${Date.now()}`;
    const password = 'secure-password-123';

    beforeAll(async () => {
      process.env.JWT_SECRET =
        'test-secret-with-more-than-thirty-two-characters';
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
      process.env.FRONTEND_ORIGIN = 'http://localhost:3000';

      const { AppModule } = await import('../src/app.module.js');
      const { Test } = await import('@nestjs/testing');
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.use(cookieParser());
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();

      const users = app.get<Repository<User>>(getRepositoryToken(User));
      await users.save(
        users.create({
          id: randomUUID(),
          username,
          name: 'Test Administrator',
          passwordHash: await hash(password, 4),
          role: 'admin',
        }),
      );
    });

    it('authenticates, lets signed-in users add users, and protects routes', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ username: `new-${username}`, name: 'New User', password })
        .expect(401);

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password })
        .expect(200);
      const loginCookie = (login.headers['set-cookie'] as string[])[0];
      expect(loginCookie).toContain('HttpOnly');
      expect(loginCookie).not.toContain('SameSite=');
      await request(app.getHttpServer()).get('/auth/me').expect(401);

      const profile = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', loginCookie)
        .expect(200);
      expect(profile.body).toMatchObject({
        id: expect.any(String),
        username,
        name: 'Test Administrator',
        role: 'admin',
      });
      expect(profile.body.email).toBeUndefined();

      const newUsername = `new-${username}`;
      const createdUser = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', loginCookie)
        .send({
          username: newUsername,
          name: 'Created User',
          password,
          role: 'admin',
        })
        .expect(201);
      expect(createdUser.body).toMatchObject({
        id: expect.any(String),
        username: newUsername,
        name: 'Created User',
        role: 'admin',
      });
      expect(createdUser.body.email).toBeUndefined();
      expect(createdUser.body.passwordHash).toBeUndefined();

      const users = await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', loginCookie)
        .expect(200);
      expect(users.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdUser.body.id,
            username: newUsername,
            role: 'admin',
          }),
          expect.objectContaining({ username, role: 'admin' }),
        ]),
      );
      expect(users.body.every((user: { passwordHash?: string }) => !user.passwordHash)).toBe(true);

      const updatedUser = await request(app.getHttpServer())
        .patch(`/users/${createdUser.body.id}`)
        .set('Cookie', loginCookie)
        .send({
          username: `updated-${newUsername}`,
          name: 'Updated User',
          password: 'updated-password-123',
          role: 'user',
        })
        .expect(200);
      expect(updatedUser.body.username).toBe(`updated-${newUsername}`);
      expect(updatedUser.body.name).toBe('Updated User');
      expect(updatedUser.body.email).toBeUndefined();
      expect(updatedUser.body.role).toBe('user');
      expect(updatedUser.body.passwordHash).toBeUndefined();

      await request(app.getHttpServer())
        .delete(`/users/${profile.body.id}`)
        .set('Cookie', loginCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', loginCookie)
        .send({
          username: username.toUpperCase(),
          name: 'Duplicate User',
          password,
        })
        .expect(409);

      await request(app.getHttpServer())
        .delete(`/users/${createdUser.body.id}`)
        .set('Cookie', loginCookie)
        .expect(200, { success: true });

      await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', loginCookie)
        .expect(200)
        .then((response) => {
          expect(response.body).not.toEqual(
            expect.arrayContaining([
              expect.objectContaining({ id: createdUser.body.id }),
            ]),
          );
        });

        it('denies Users API access to regular users', async () => {
          const users = app.get<Repository<User>>(getRepositoryToken(User));
          const regularUsername = `regular-${username}`;
          await users.save(
            users.create({
              id: randomUUID(),
              username: regularUsername,
              name: 'Regular User',
              passwordHash: await hash(password, 4),
              role: 'user',
            }),
          );
          const login = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ username: regularUsername, password })
            .expect(200);
          const cookie = (login.headers['set-cookie'] as string[])[0];

          await request(app.getHttpServer())
            .get('/users')
            .set('Cookie', cookie)
            .expect(403);
          await request(app.getHttpServer())
            .post('/users')
            .set('Cookie', cookie)
            .send({
              username: `blocked-${regularUsername}`,
              name: 'Blocked User',
              password,
            })
            .expect(403);
        });

      const logout = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', loginCookie)
        .expect(200);
      expect(logout.headers['set-cookie'][0]).toContain('access_token=;');
    });

    it('rejects incorrect passwords and invalid user data', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password: 'wrong-password' })
        .expect(401);

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password })
        .expect(200);

      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', (login.headers['set-cookie'] as string[])[0])
        .send({ username: '', name: '', password: 'short' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', (login.headers['set-cookie'] as string[])[0])
        .send({
          username: `role-${username}`,
          name: 'Invalid Role',
          password,
          role: 'owner',
        })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/users/${randomUUID()}`)
        .set('Cookie', (login.headers['set-cookie'] as string[])[0])
        .send({})
        .expect(400);
    });

    afterAll(async () => {
      await app?.close();
    });
  },
);
