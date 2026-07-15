import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateThreadDto {
  @IsUUID()
  recipientUserId!: string;

  @IsString()
  @MaxLength(8000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

export class OpenThreadDto {
  @IsUUID()
  recipientUserId!: string;
}

export class SendMessageDto {
  @IsString()
  @MaxLength(8000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

export class SearchContactsQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string;

  @Type(() => Number)
  limit?: number;
}
