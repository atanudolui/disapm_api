import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { AuthModule } from './auth/auth.module.js';
import { CreateUsers20261106150000 } from './database/migrations/20261106150000-create-users.js';
import { AddUserRole20261106160000 } from './database/migrations/20261106160000-add-user-role.js';
import { CreateGhatReadiness20261106170000 } from './database/migrations/20261106170000-create-ghat-readiness.js';
import { AddUserNameAndUsername20261106180000 } from './database/migrations/20261106180000-add-user-name-and-username.js';
import { RemoveUserEmail20261106190000 } from './database/migrations/20261106190000-remove-user-email.js';
import { ReplaceGhatLocationFields20261106220000 } from './database/migrations/20261106220000-replace-ghat-location-fields.js';
import { UpdateInspectionFields20261106230000 } from './database/migrations/20261106230000-update-inspection-fields.js';
import { SplitInspectionAreas20261107000000 } from './database/migrations/20261107000000-split-inspection-areas.js';
import { AddGhatOwnership20261107100000 } from './database/migrations/20261107100000-add-ghat-ownership.js';
import { AddInspectionLocationAndPhotos20261107110000 } from './database/migrations/20261107110000-add-inspection-location-and-photos.js';
import { GhatsModule } from './ghats/ghats.module.js';

function validateEnvironment(config: Record<string, unknown>) {
  const isProduction = config.NODE_ENV === 'production';
  let jwtSecret =
    typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET.trim() : '';

  if (!jwtSecret && isProduction) {
    throw new Error(
      'JWT_SECRET is required in production and must be at least 32 characters.',
    );
  }
  if (!jwtSecret) {
    jwtSecret = randomBytes(32).toString('base64url');
    console.warn(
      'JWT_SECRET is not set; using an ephemeral development-only secret. Sessions will expire when the API restarts.',
    );
  } else if (Buffer.byteLength(jwtSecret) < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters.');
  }

  const databaseUrl =
    typeof config.DATABASE_URL === 'string' ? config.DATABASE_URL.trim() : '';
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Set it to your PostgreSQL connection string.',
    );
  }
  if (
    !databaseUrl.startsWith('postgres://') &&
    !databaseUrl.startsWith('postgresql://')
  ) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  }

  const port = Number(config.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  return {
    ...config,
    JWT_SECRET: jwtSecret,
    DATABASE_URL: databaseUrl,
    PORT: port,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        migrations: [
          CreateUsers20261106150000,
          AddUserRole20261106160000,
          CreateGhatReadiness20261106170000,
          AddUserNameAndUsername20261106180000,
          RemoveUserEmail20261106190000,
          ReplaceGhatLocationFields20261106220000,
          UpdateInspectionFields20261106230000,
          SplitInspectionAreas20261107000000,
          AddGhatOwnership20261107100000,
          AddInspectionLocationAndPhotos20261107110000,
        ],
      }),
    }),
    AuthModule,
    GhatsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
