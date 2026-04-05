import { IsArray, IsUUID } from 'class-validator';

export class SetOrganizationCatalogDto {
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  productIds!: string[];
}
