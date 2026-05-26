import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class OpenSessionCaisseDto {
  @Min(0)
  @Type(() => Number)
  fondOuverture!: number;
}

export class CloseSessionCaisseDto {
  @Min(0)
  @Type(() => Number)
  fondCloture!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  commentaireCloture?: string;
}
