import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePoleDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Le code du pôle doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le code du pôle est requis' })
  @MaxLength(80, { message: 'Le code ne doit pas dépasser 80 caractères' })
  public code!: string;

  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Le nom du pôle doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom du pôle est requis' })
  @MaxLength(255, { message: 'Le nom ne doit pas dépasser 255 caractères' })
  public name!: string;

  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t.length === 0 ? undefined : t;
  })
  @IsString({
    message: 'La description doit être une chaîne de caractères',
  })
  @IsOptional()
  @MaxLength(2000, {
    message: 'La description ne doit pas dépasser 2000 caractères',
  })
  public description?: string;
}
