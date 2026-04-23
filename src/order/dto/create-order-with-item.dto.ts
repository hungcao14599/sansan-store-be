import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateOrderWithItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
