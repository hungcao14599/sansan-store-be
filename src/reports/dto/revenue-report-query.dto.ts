import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class RevenueReportQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'quarter', 'year'])
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';

  @IsOptional()
  @Type(() => String)
  @IsDateString()
  from?: string;

  @IsOptional()
  @Type(() => String)
  @IsDateString()
  to?: string;
}
