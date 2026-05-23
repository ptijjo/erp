import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const CONTRACT_TYPES = ['CDI', 'CDD', 'STAGE', 'INTERIM', 'OTHER'] as const;
const CONTRACT_STATUSES = ['ACTIVE', 'EXPIRED', 'TERMINATED'] as const;

export class CreateEmploymentContractDto {
  @IsUUID('4')
  employeeId!: string;

  @IsIn(CONTRACT_TYPES)
  type!: (typeof CONTRACT_TYPES)[number];

  @IsOptional()
  @IsIn(CONTRACT_STATUSES)
  status?: (typeof CONTRACT_STATUSES)[number];

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateEmploymentContractDto {
  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  type?: (typeof CONTRACT_TYPES)[number];

  @IsOptional()
  @IsIn(CONTRACT_STATUSES)
  status?: (typeof CONTRACT_STATUSES)[number];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
