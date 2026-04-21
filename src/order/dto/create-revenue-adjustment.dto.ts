import { IsNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRevenueAdjustmentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;
}
