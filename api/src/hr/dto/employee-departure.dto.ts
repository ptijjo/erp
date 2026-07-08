import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const EMPLOYEE_DEPARTURE_REASONS = [
  'RESIGNATION',
  'DISMISSAL',
  'END_OF_CONTRACT',
  'RETIREMENT',
  'ABANDONMENT',
  'OTHER',
] as const;

export type EmployeeDepartureReasonValue =
  (typeof EMPLOYEE_DEPARTURE_REASONS)[number];

export class CreateEmployeeDepartureDto {
  @IsUUID('4')
  employeeId!: string;

  @IsIn(EMPLOYEE_DEPARTURE_REASONS)
  reason!: EmployeeDepartureReasonValue;

  @IsDate()
  @Type(() => Date)
  departureDate!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateEmployeeDepartureDto {
  @IsOptional()
  @IsIn(EMPLOYEE_DEPARTURE_REASONS)
  reason?: EmployeeDepartureReasonValue;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  departureDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
