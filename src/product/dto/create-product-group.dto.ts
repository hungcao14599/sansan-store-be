import { IsOptional, IsString } from 'class-validator';

export class CreateProductGroupDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
