import { IsInt, IsPositive, IsString } from 'class-validator';

export class AddOrderItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
