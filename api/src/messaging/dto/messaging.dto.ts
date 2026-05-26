import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateThreadDto {
  @IsUUID()
  recipientUserId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}

export class SearchContactsQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string;

  @Type(() => Number)
  limit?: number;
}
