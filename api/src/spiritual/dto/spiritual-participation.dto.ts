import { IsIn } from 'class-validator';

export class RespondSpiritualParticipationDto {
  @IsIn(['ACCEPTED', 'DECLINED'])
  response!: 'ACCEPTED' | 'DECLINED';
}
