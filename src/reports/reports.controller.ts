import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RevenueReportQueryDto } from './dto/revenue-report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue/export')
  async exportRevenue(
    @Query() query: RevenueReportQueryDto,
    @Res() res: Response,
  ) {
    const { buffer, filename } =
      await this.reportsService.exportRevenueReport(query);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('revenue')
  getRevenue(@Query() query: RevenueReportQueryDto) {
    return this.reportsService.getRevenueReport(query);
  }
}
