import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSpiritualEventDto {
  @IsUUID('4')
  organizationId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsIn(['PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])
  status?: 'PLANNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

export class UpdateSpiritualEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsIn(['PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])
  status?: 'PLANNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}
