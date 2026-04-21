import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

class ReturnPaidOrderItemDto {
  @IsString()
  orderItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}

export class ReturnPaidOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReturnPaidOrderItemDto)
  items!: ReturnPaidOrderItemDto[];

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  refundReference?: string;
}
