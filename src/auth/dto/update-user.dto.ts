import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUserDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['user', 'admin'])
  role?: 'user' | 'admin';
}
