import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateLeaveBalanceDto {
  @IsUUID('4')
  employeeId!: string;

  /** Exercice (année du mois de mai). Par défaut : exercice en cours. */
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  /** Ignoré si absent : 30 j + cumul des exercices précédents. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  @Type(() => Number)
  totalDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  @Type(() => Number)
  usedDays?: number;
}

export class UpdateLeaveBalanceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(366)
  @Type(() => Number)
  totalDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(366)
  @Type(() => Number)
  usedDays?: number;
}
