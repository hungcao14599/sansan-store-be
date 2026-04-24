import {
  IsEnum,
  Max,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { TaxCategory } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  productGroupId?: string;

  @IsOptional()
  @IsString()
  productGroupName?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsEnum(TaxCategory)
  taxCategory?: TaxCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;
}
