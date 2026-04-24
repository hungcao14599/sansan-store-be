import { IsIn, IsOptional, IsString } from 'class-validator';

export class ExportProductsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['ALL', 'IN_STOCK', 'OUT_OF_STOCK'])
  stock?: 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';

  @IsOptional()
  @IsIn(['ALL', 'YES', 'NO'])
  active?: 'ALL' | 'YES' | 'NO';

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  productGroupId?: string;

  @IsOptional()
  @IsIn(['ALL', 'CUSTOM'])
  forecastMode?: 'ALL' | 'CUSTOM';

  @IsOptional()
  @IsIn(['LOW', 'OUT'])
  forecastLevel?: 'LOW' | 'OUT';

  @IsOptional()
  @IsString()
  createdFrom?: string;

  @IsOptional()
  @IsString()
  createdTo?: string;

  @IsOptional()
  @IsString()
  ids?: string;
}
