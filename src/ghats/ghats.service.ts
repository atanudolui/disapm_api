import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import type {
  ChecklistItem,
  InspectionArea,
  InspectionDeficiency,
} from './ghat-inspection.entity.js';
import { GhatInspection, INSPECTION_AREAS } from './ghat-inspection.entity.js';
import {
  GhatInspectionPhoto,
  type UploadedInspectionPhoto,
} from './ghat-inspection-photo.entity.js';
import { Ghat } from './ghat.entity.js';
import { User } from '../auth/user.entity.js';
import type { CreateGhatDto, UpdateGhatDto } from './dto/ghat.dto.js';
import type {
  CreateInspectionDto,
  UpdateInspectionDto,
} from './dto/inspection.dto.js';

interface UserScope {
  userId: string;
  role: 'user' | 'admin';
}

@Injectable()
export class GhatsService {
  constructor(
    @InjectRepository(Ghat)
    private readonly ghats: Repository<Ghat>,
    @InjectRepository(GhatInspection)
    private readonly inspections: Repository<GhatInspection>,
    @InjectRepository(GhatInspectionPhoto)
    private readonly photos: Repository<GhatInspectionPhoto>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async listGhats(scope: UserScope) {
    const ghats = await this.ghats.find({
      relations: { inspections: { photos: true } },
      order: { district: 'ASC', name: 'ASC' },
    });
    if (scope.role === 'admin') return ghats;

    return ghats.filter((ghat) => {
      const hasUserInspection = ghat.inspections.some(
        (inspection) => inspection.createdBy === scope.userId,
      );
      if (ghat.createdBy !== scope.userId && !hasUserInspection) return false;
      ghat.inspections = ghat.inspections.filter(
        (inspection) => inspection.createdBy === scope.userId,
      );
      return true;
    });
  }

  async getGhat(id: string, scope: UserScope) {
    const ghat = await this.ghats.findOne({
      where: { id },
      relations: { inspections: { photos: true } },
    });
    if (!ghat) throw new NotFoundException('Ghat not found.');
    this.assertGhatAccess(ghat, scope);
    if (scope.role !== 'admin') {
      ghat.inspections = ghat.inspections.filter(
        (inspection) => inspection.createdBy === scope.userId,
      );
    }
    ghat.inspections.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
    return ghat;
  }

  async createGhat(dto: CreateGhatDto, createdBy: string) {
    const ghat = this.ghats.create({
      id: randomUUID(),
      createdBy,
      ...normalizeGhat(dto),
    });
    return this.ghats.save(ghat);
  }

  async updateGhat(id: string, dto: UpdateGhatDto, scope: UserScope) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Provide at least one ghat field to update.',
      );
    }
    const ghat = await this.ghats.findOneBy({ id });
    if (!ghat) throw new NotFoundException('Ghat not found.');
    this.assertGhatOwner(ghat, scope);
    Object.assign(ghat, normalizeGhat(dto));
    return this.ghats.save(ghat);
  }

  async deleteGhat(id: string, scope: UserScope) {
    const ghat = await this.ghats.findOneBy({ id });
    if (!ghat) throw new NotFoundException('Ghat not found.');
    this.assertGhatOwner(ghat, scope);
    const result = await this.ghats.delete({ id });
    if (!result.affected) throw new NotFoundException('Ghat not found.');
    return { success: true };
  }

  async listInspections(ghatId: string, scope: UserScope) {
    await this.requireGhatAccess(ghatId, scope);
    const inspections = await this.inspections.find({
      where: { ghatId },
      relations: { photos: true },
      order: { periodStart: 'DESC', createdAt: 'DESC' },
    });
    return scope.role === 'admin'
      ? inspections
      : inspections.filter(
          (inspection) => inspection.createdBy === scope.userId,
        );
  }

  async createInspection(
    ghatId: string,
    dto: CreateInspectionDto,
    inspectedBy: string,
    createdBy: string,
    scope: UserScope,
    uploadedPhotos: UploadedInspectionPhoto[] = [],
  ) {
    await this.requireGhatAccess(ghatId, scope);
    validateInspectionPeriod(dto.periodStart, dto.periodEnd);
    validateChecklistAndDeficiencies(dto.checklist, dto.deficiencies);
    const photos = validateUploadedPhotos(uploadedPhotos);
    const deficiencies = dto.deficiencies.map((deficiency) => ({
      category: deficiency.category,
      description: deficiency.description.trim(),
      status: deficiency.status,
      actionTaken: deficiency.actionTaken ?? '',
    }));
    const inspection = this.inspections.create({
      id: randomUUID(),
      ghatId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      occasion: dto.occasion.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      checklist: dto.checklist,
      deficiencies,
      inspectedBy,
      createdBy,
    });
    if (photos.length === 0) {
      return this.inspections.save(inspection);
    }
    return this.inspections.manager.transaction(async (manager) => {
      const saved = await manager.save(GhatInspection, inspection);
      if (photos.length > 0) {
        await manager.save(
          GhatInspectionPhoto,
          photos.map((photo) => ({
            id: randomUUID(),
            inspectionId: saved.id,
            ...photo,
          })),
        );
      }
      return saved;
    });
  }

  async updateInspection(
    id: string,
    dto: UpdateInspectionDto,
    scope: UserScope,
    uploadedPhotos: UploadedInspectionPhoto[] = [],
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Provide at least one inspection field to update.',
      );
    }
    const inspection = await this.inspections.findOneBy({ id });
    if (!inspection) throw new NotFoundException('Inspection not found.');
    if (scope.role !== 'admin' && inspection.createdBy !== scope.userId) {
      throw new NotFoundException('Inspection not found.');
    }

    const checklist = dto.checklist ?? inspection.checklist;
    const deficiencies = (dto.deficiencies ??
      inspection.deficiencies) as InspectionDeficiency[];
    const photos = validateUploadedPhotos(uploadedPhotos);
    const removePhotoIds = dto.removePhotoIds ?? [];
    const photosToRemove =
      removePhotoIds.length > 0
        ? await this.photos.findBy({
            id: In(removePhotoIds),
            inspectionId: id,
          })
        : [];
    if (photosToRemove.length !== removePhotoIds.length) {
      throw new BadRequestException(
        'One or more selected photos do not belong to this inspection.',
      );
    }
    const existingPhotoCount =
      photos.length > 0 || photosToRemove.length > 0
        ? await this.photos.countBy({ inspectionId: id })
        : 0;
    if (
      existingPhotoCount - photosToRemove.length + photos.length >
      2
    ) {
      throw new BadRequestException(
        'An inspection can have no more than 2 photos.',
      );
    }
    const periodStart = dto.periodStart ?? inspection.periodStart;
    const periodEnd = dto.periodEnd ?? inspection.periodEnd;
    validateInspectionPeriod(periodStart, periodEnd);
    validateChecklistAndDeficiencies(checklist, deficiencies);
    Object.assign(inspection, {
      periodStart,
      periodEnd,
      occasion: dto.occasion?.trim() ?? inspection.occasion,
      latitude: dto.latitude ?? inspection.latitude,
      longitude: dto.longitude ?? inspection.longitude,
      checklist: dto.checklist ?? inspection.checklist,
      deficiencies: deficiencies.map((deficiency) => ({
        category: deficiency.category,
        description: deficiency.description.trim(),
        status: deficiency.status,
        actionTaken: deficiency.actionTaken ?? '',
      })),
    });
    if (photos.length === 0 && photosToRemove.length === 0) {
      return this.inspections.save(inspection);
    }
    return this.inspections.manager.transaction(async (manager) => {
      const saved = await manager.save(GhatInspection, inspection);
      if (photosToRemove.length > 0) {
        await manager.delete(GhatInspectionPhoto, {
          id: In(photosToRemove.map(({ id: photoId }) => photoId)),
          inspectionId: id,
        });
      }
      await manager.save(
        GhatInspectionPhoto,
        photos.map((photo) => ({
          id: randomUUID(),
          inspectionId: saved.id,
          ...photo,
        })),
      );
      return saved;
    });
  }

  async getInspectionPhoto(
    inspectionId: string,
    photoId: string,
    scope: UserScope,
  ) {
    const inspection = await this.inspections.findOneBy({ id: inspectionId });
    if (
      !inspection ||
      (scope.role !== 'admin' && inspection.createdBy !== scope.userId)
    ) {
      throw new NotFoundException('Inspection photo not found.');
    }
    const photo = await this.photos
      .createQueryBuilder('photo')
      .addSelect('photo.data')
      .where('photo.id = :photoId', { photoId })
      .andWhere('photo.inspectionId = :inspectionId', { inspectionId })
      .getOne();
    if (!photo) throw new NotFoundException('Inspection photo not found.');
    return photo;
  }

  async getActionTakenReport(scope: UserScope) {
    const [ghats, inspections] = await Promise.all([
      this.ghats.find({
        relations: { inspections: true },
        order: { district: 'ASC', name: 'ASC' },
      }),
      this.inspections.find({
        relations: { photos: true },
        order: { periodStart: 'DESC', createdAt: 'DESC' },
      }),
    ]);
    const visibleGhats =
      scope.role === 'admin'
        ? ghats
        : ghats.filter(
            (ghat) =>
              ghat.createdBy === scope.userId ||
              ghat.inspections.some(
                (inspection) => inspection.createdBy === scope.userId,
              ),
          );
    const visibleGhatIds = new Set(visibleGhats.map((ghat) => ghat.id));
    const visibleInspections =
      scope.role === 'admin'
        ? inspections.filter((inspection) =>
            visibleGhatIds.has(inspection.ghatId),
          )
        : inspections.filter(
            (inspection) =>
              visibleGhatIds.has(inspection.ghatId) &&
              inspection.createdBy === scope.userId,
          );

    const recorderIds = [
      ...new Set(
        visibleInspections
          .map((inspection) => inspection.createdBy)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ];
    const recorders = recorderIds.length
      ? await this.users.find({
          where: { id: In(recorderIds) },
          select: { id: true, name: true },
        })
      : [];
    const recorderNames = new Map(
      recorders.map((recorder) => [recorder.id, recorder.name]),
    );
    const getRecorderName = (inspection: GhatInspection) =>
      (inspection.createdBy && recorderNames.get(inspection.createdBy)) ||
      inspection.inspectedBy;

    const latestByGhat = new Map<string, GhatInspection>();
    for (const inspection of visibleInspections) {
      if (!latestByGhat.has(inspection.ghatId)) {
        latestByGhat.set(inspection.ghatId, inspection);
      }
    }
    const inspectionsByGhat = new Map<string, GhatInspection[]>();
    for (const inspection of visibleInspections) {
      const ghatInspections = inspectionsByGhat.get(inspection.ghatId) ?? [];
      ghatInspections.push(inspection);
      inspectionsByGhat.set(inspection.ghatId, ghatInspections);
    }
    const ghatEntries = visibleGhats.map((ghat) => {
      const latestInspection = latestByGhat.get(ghat.id);
      const pendingDeficiencies =
        latestInspection?.deficiencies.filter(
          (deficiency) => deficiency.status === 'pending',
        ) ?? [];
      return {
        ghat: {
          id: ghat.id,
          name: ghat.name,
          waterbodyType: ghat.waterbodyType,
          district: ghat.district,
          subDivision: ghat.subDivision,
          block: ghat.block,
          nodalOfficerName: ghat.nodalOfficerName,
          nodalOfficerContact: ghat.nodalOfficerContact,
        },
        inspections: (inspectionsByGhat.get(ghat.id) ?? []).map(
          (inspection) => ({
            id: inspection.id,
            periodStart: inspection.periodStart,
            periodEnd: inspection.periodEnd,
            occasion: inspection.occasion,
            latitude: inspection.latitude,
            longitude: inspection.longitude,
            inspectedBy: getRecorderName(inspection),
            createdAt: inspection.createdAt,
            updatedAt: inspection.updatedAt,
            checklist: inspection.checklist,
            deficiencies: inspection.deficiencies,
            photos: (inspection.photos ?? []).map(({ id, fileName }) => ({
              id,
              fileName,
            })),
          }),
        ),
        latestInspection: latestInspection
          ? {
              id: latestInspection.id,
              periodStart: latestInspection.periodStart,
              periodEnd: latestInspection.periodEnd,
              occasion: latestInspection.occasion,
              latitude: latestInspection.latitude,
              longitude: latestInspection.longitude,
              inspectedBy: getRecorderName(latestInspection),
              checklist: latestInspection.checklist,
              photos: (latestInspection.photos ?? []).map(
                ({ id, fileName }) => ({ id, fileName }),
              ),
            }
          : null,
        pendingDeficiencies,
        rectifiedDeficiencies:
          latestInspection?.deficiencies.filter(
            (deficiency) => deficiency.status === 'rectified',
          ) ?? [],
      };
    });
    const pendingCount = ghatEntries.reduce(
      (count, entry) => count + entry.pendingDeficiencies.length,
      0,
    );

    return {
      generatedAt: new Date().toISOString(),
      totalGhats: visibleGhats.length,
      inspectedGhats: ghatEntries.filter((entry) => entry.latestInspection)
        .length,
      pendingDeficiencies: pendingCount,
      ghats: ghatEntries,
    };
  }

  private async requireGhatAccess(id: string, scope: UserScope) {
    const ghat = await this.ghats.findOne({
      where: { id },
      relations: { inspections: { photos: true } },
    });
    if (!ghat) throw new NotFoundException('Ghat not found.');
    this.assertGhatAccess(ghat, scope);
    return ghat;
  }

  private assertGhatAccess(ghat: Ghat, scope: UserScope) {
    if (
      scope.role !== 'admin' &&
      ghat.createdBy !== scope.userId &&
      !ghat.inspections.some(
        (inspection) => inspection.createdBy === scope.userId,
      )
    ) {
      throw new NotFoundException('Ghat not found.');
    }
  }

  private assertGhatOwner(ghat: Ghat, scope: UserScope) {
    if (scope.role !== 'admin' && ghat.createdBy !== scope.userId) {
      throw new NotFoundException('Ghat not found.');
    }
  }
}

function validateUploadedPhotos(files: UploadedInspectionPhoto[]) {
  if (files.length > 2) {
    throw new BadRequestException(
      'Upload no more than 2 photos per inspection.',
    );
  }

  return files.map((file) => {
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException(
        'Each inspection photo must be 2 MB or smaller.',
      );
    }
    if (!isSupportedImage(file.mimetype, file.buffer)) {
      throw new BadRequestException(
        'Inspection photos must be valid JPEG, PNG, or WebP images.',
      );
    }
    const fileName =
      Array.from(file.originalname)
        .map((character) =>
          /[\\/]/.test(character) ||
          character.charCodeAt(0) < 32 ||
          character.charCodeAt(0) === 127
            ? '_'
            : character,
        )
        .join('')
        .slice(0, 255) || 'inspection-photo';
    return {
      fileName,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
    };
  });
}

function isSupportedImage(mimeType: string, data: Buffer) {
  if (
    mimeType === 'image/jpeg' &&
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  ) {
    return true;
  }
  if (
    mimeType === 'image/png' &&
    data.length >= 8 &&
    data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return true;
  }
  return (
    mimeType === 'image/webp' &&
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  );
}

function normalizeGhat(
  dto: Partial<CreateGhatDto | UpdateGhatDto>,
): Partial<Ghat> {
  return {
    ...(dto.name !== undefined && { name: dto.name.trim() }),
    ...(dto.waterbodyType !== undefined && {
      waterbodyType: dto.waterbodyType,
    }),
    ...(dto.district !== undefined && { district: dto.district.trim() }),
    ...(dto.subDivision !== undefined && {
      subDivision: dto.subDivision.trim(),
    }),
    ...(dto.block !== undefined && { block: dto.block.trim() }),
    ...(dto.nodalOfficerName !== undefined && {
      nodalOfficerName: dto.nodalOfficerName.trim(),
    }),
    ...(dto.nodalOfficerContact !== undefined && {
      nodalOfficerContact: dto.nodalOfficerContact.trim(),
    }),
  };
}

function validateInspectionPeriod(periodStart: string, periodEnd: string) {
  for (const date of [periodStart, periodEnd]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) ||
      new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date
    ) {
      throw new BadRequestException(
        'Festival period dates must be valid dates in YYYY-MM-DD format.',
      );
    }
  }
  if (periodStart > periodEnd) {
    throw new BadRequestException(
      'The festival period end date must be on or after the start date.',
    );
  }
}

function validateChecklistAndDeficiencies(
  checklist: Record<InspectionArea, ChecklistItem>,
  deficiencies: Array<
    Omit<InspectionDeficiency, 'actionTaken'> & { actionTaken?: string }
  >,
) {
  for (const area of INSPECTION_AREAS) {
    const item = checklist[area];
    if (item.status === 'deficiency' && !item.notes.trim()) {
      throw new BadRequestException(
        `Add findings for the ${area} checklist deficiency.`,
      );
    }
    if (
      item.status === 'deficiency' &&
      !deficiencies.some((deficiency) => deficiency.category === area)
    ) {
      throw new BadRequestException(
        `Add a tracked deficiency for the ${area} checklist item.`,
      );
    }
  }
  for (const deficiency of deficiencies) {
    if (
      !checklist[deficiency.category] ||
      checklist[deficiency.category].status !== 'deficiency'
    ) {
      throw new BadRequestException(
        'Each deficiency must belong to a checklist area marked as deficient.',
      );
    }
    if (deficiency.status === 'rectified' && !deficiency.actionTaken?.trim()) {
      throw new BadRequestException(
        'Describe the action taken for every rectified deficiency.',
      );
    }
  }
}
