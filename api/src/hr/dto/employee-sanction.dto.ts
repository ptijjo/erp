import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const EMPLOYEE_SANCTION_TYPES = [
  'WARNING',
  'SUSPENSION',
  'LAYOFF',
] as const;

export type EmployeeSanctionTypeValue =
  (typeof EMPLOYEE_SANCTION_TYPES)[number];

export class CreateEmployeeSanctionDto {
  @IsUUID('4')
  employeeId!: string;

  @IsIn(EMPLOYEE_SANCTION_TYPES)
  type!: EmployeeSanctionTypeValue;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateEmployeeSanctionDto {
  @IsOptional()
  @IsIn(EMPLOYEE_SANCTION_TYPES)
  type?: EmployeeSanctionTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
