import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ValidationError } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateGhatDto, UpdateGhatDto } from './dto/ghat.dto.js';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
} from './dto/inspection.dto.js';
import type { UploadedInspectionPhoto } from './ghat-inspection-photo.entity.js';
import { GhatsService } from './ghats.service.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; username: string; role: 'user' | 'admin' };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class GhatsController {
  constructor(private readonly ghats: GhatsService) {}

  @Get('ghats')
  listGhats(@Req() request: AuthenticatedRequest) {
    return this.ghats.listGhats(request.user);
  }

  @Get('ghats/:id')
  getGhat(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ghats.getGhat(id, request.user);
  }

  @Post('ghats')
  createGhat(@Body() dto: CreateGhatDto, @Req() request: AuthenticatedRequest) {
    return this.ghats.createGhat(dto, request.user.userId);
  }

  @Patch('ghats/:id')
  updateGhat(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGhatDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ghats.updateGhat(id, dto, request.user);
  }

  @Delete('ghats/:id')
  deleteGhat(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ghats.deleteGhat(id, request.user);
  }

  @Get('ghats/:id/inspections')
  listInspections(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ghats.listInspections(id, request.user);
  }

  @Post('ghats/:id/inspections')
  @UseInterceptors(
    FilesInterceptor('photos', 2, {
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 2,
        fieldSize: 256 * 1024,
        fields: 1,
        parts: 3,
      },
    }),
  )
  createInspection(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: unknown,
    @UploadedFiles() photos: UploadedInspectionPhoto[],
    @Req() request: AuthenticatedRequest,
  ) {
    return parseInspectionDto(payload, CreateInspectionDto).then((dto) =>
      this.ghats.createInspection(
        id,
        dto,
        request.user.username,
        request.user.userId,
        request.user,
        photos ?? [],
      ),
    );
  }

  @Patch('inspections/:id')
  @UseInterceptors(
    FilesInterceptor('photos', 2, {
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 2,
        fieldSize: 256 * 1024,
        fields: 1,
        parts: 3,
      },
    }),
  )
  updateInspection(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() payload: unknown,
    @UploadedFiles() photos: UploadedInspectionPhoto[],
    @Req() request: AuthenticatedRequest,
  ) {
    return parseInspectionDto(payload, UpdateInspectionDto).then((dto) =>
      this.ghats.updateInspection(id, dto, request.user, photos ?? []),
    );
  }

  @Get('inspections/:id/photos/:photoId')
  @Header('Cache-Control', 'private, no-store')
  async getInspectionPhoto(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('photoId', new ParseUUIDPipe()) photoId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const photo = await this.ghats.getInspectionPhoto(
      id,
      photoId,
      request.user,
    );
    return new StreamableFile(photo.data, {
      type: photo.mimeType,
      disposition: 'inline',
    });
  }

  @Get('reports/action-taken')
  actionTakenReport(@Req() request: AuthenticatedRequest) {
    return this.ghats.getActionTakenReport(request.user);
  }
}

function parseInspectionDto<T extends object>(
  payload: unknown,
  dtoType: new () => T,
): Promise<T> {
  let value = payload;
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'inspection' in payload
  ) {
    value = payload.inspection;
  }
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      throw new BadRequestException('Inspection data must be valid JSON.');
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Inspection data must be an object.');
  }

  const dto = plainToInstance(dtoType, value);
  return validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }).then((errors) => {
    if (errors.length > 0) {
      throw new BadRequestException(errors.flatMap(getValidationMessages));
    }
    return dto;
  });
}

function getValidationMessages(error: ValidationError): string[] {
  return [
    ...Object.values(error.constraints ?? {}),
    ...(error.children ?? []).flatMap(getValidationMessages),
  ];
}
