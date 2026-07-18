import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CloseAccountingPeriodDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;

  /** Omit pour clôture groupe (maison mère uniquement). */
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class ReopenAccountingPeriodDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
