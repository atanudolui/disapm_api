import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateGhatDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsIn(['river', 'pond'])
  waterbodyType!: 'river' | 'pond';

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  district!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  subDivision!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  block!: string;

  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nodalOfficerName?: string;

  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  nodalOfficerContact?: string;
}

export class UpdateGhatDto {
  @ValidateIf((_, value) => value !== '')
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ValidateIf((_, value) => value !== '')
  @IsOptional()
  @IsIn(['river', 'pond'])
  waterbodyType?: 'river' | 'pond';

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  subDivision?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  block?: string;

  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nodalOfficerName?: string;

  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  nodalOfficerContact?: string;
}
