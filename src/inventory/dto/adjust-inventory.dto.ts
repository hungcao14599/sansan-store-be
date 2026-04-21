import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AdjustInventoryDto {
  @IsIn(['RESTOCK', 'ADJUSTMENT'])
  type!: 'RESTOCK' | 'ADJUSTMENT';

  @IsNumber()
  delta!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
