import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { User } from '../auth/user.entity.js';
import { GhatInspection } from './ghat-inspection.entity.js';
import { GhatInspectionPhoto } from './ghat-inspection-photo.entity.js';
import { Ghat } from './ghat.entity.js';
import { GhatsController } from './ghats.controller.js';
import { GhatsService } from './ghats.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ghat, GhatInspection, GhatInspectionPhoto, User]),
  ],
  controllers: [GhatsController],
  providers: [GhatsService, JwtAuthGuard],
})
export class GhatsModule {}
