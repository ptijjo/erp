import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PlanningShiftType } from '../../generated/prisma/client';

export class CreatePlanningShiftDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsEnum(PlanningShiftType)
  @IsOptional()
  type?: PlanningShiftType;

  @IsString()
  @IsOptional()
  note?: string | null;

  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  organizationId!: string;
}

export class UpdatePlanningShiftDto {
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsEnum(PlanningShiftType)
  @IsOptional()
  type?: PlanningShiftType;

  @IsString()
  @IsOptional()
  note?: string | null;
}
