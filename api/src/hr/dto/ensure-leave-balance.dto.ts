import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';

export class EnsureLeaveBalanceDto {
  @IsUUID('4')
  employeeId!: string;

  /** Date de référence pour l’exercice (défaut : aujourd’hui). */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  referenceDate?: Date;
}
