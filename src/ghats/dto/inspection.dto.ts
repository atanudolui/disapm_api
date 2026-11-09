import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsDefined,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  FESTIVAL_OCCASIONS,
  INSPECTION_AREAS,
  type InspectionArea,
} from '../ghat-inspection.entity.js';

export class ChecklistItemDto {
  @IsIn(['compliant', 'deficiency', 'not_applicable'])
  status!: 'compliant' | 'deficiency' | 'not_applicable';

  @IsString()
  @MaxLength(2000)
  notes!: string;
}

export class InspectionChecklistDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  approachRoadsPathways!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  ghatLighting!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  crowdManagement!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  safety!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  policeWomenPolice!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  cctvPublicAddress!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  rescueTeam!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  drinkingWaterSanitation!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  womenFacilitiesSignage!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  emergencyResponse!: ChecklistItemDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => ChecklistItemDto)
  cleanliness!: ChecklistItemDto;
}

export class InspectionDeficiencyDto {
  @IsIn(INSPECTION_AREAS)
  category!: InspectionArea;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  description!: string;

  @IsIn(['pending', 'rectified'])
  status!: 'pending' | 'rectified';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  actionTaken?: string;
}

export class CreateInspectionDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsIn(FESTIVAL_OCCASIONS)
  occasion!: (typeof FESTIVAL_OCCASIONS)[number];

  @IsDefined()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsDefined()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => InspectionChecklistDto)
  checklist!: InspectionChecklistDto;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InspectionDeficiencyDto)
  deficiencies!: InspectionDeficiencyDto[];
}

export class UpdateInspectionDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  removePhotoIds?: string[];

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsIn(FESTIVAL_OCCASIONS)
  occasion?: (typeof FESTIVAL_OCCASIONS)[number];

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => InspectionChecklistDto)
  checklist?: InspectionChecklistDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InspectionDeficiencyDto)
  deficiencies?: InspectionDeficiencyDto[];
}
