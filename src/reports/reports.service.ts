import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, RevenueLogType } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../common/prisma/prisma.service';
import { RevenueReportQueryDto } from './dto/revenue-report-query.dto';

type RevenueRow = {
  period: Date;
  total: Prisma.Decimal;
  salesRevenue: Prisma.Decimal;
  adjustmentRevenue: Prisma.Decimal;
  entries: number;
};

type ProductSalesRow = {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantitySold: number;
  ordersCount: number;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalRevenue: Prisma.Decimal;
};

type ReportGroupBy = NonNullable<RevenueReportQueryDto['groupBy']>;

const REPORT_GROUP_CONFIG: Record<
  ReportGroupBy,
  {
    trunc: Prisma.Sql;
    step: Prisma.Sql;
  }
> = {
  day: {
    trunc: Prisma.raw(`'day'`),
    step: Prisma.raw(`interval '1 day'`),
  },
  week: {
    trunc: Prisma.raw(`'week'`),
    step: Prisma.raw(`interval '1 week'`),
  },
  month: {
    trunc: Prisma.raw(`'month'`),
    step: Prisma.raw(`interval '1 month'`),
  },
  quarter: {
    trunc: Prisma.raw(`'quarter'`),
    step: Prisma.raw(`interval '3 months'`),
  },
  year: {
    trunc: Prisma.raw(`'year'`),
    step: Prisma.raw(`interval '1 year'`),
  },
};

const REPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const SALE_LOG_TYPE_SQL = Prisma.raw(`'SALE'::"RevenueLogType"`);
const ADJUSTMENT_LOG_TYPE_SQL = Prisma.raw(`'ADJUSTMENT'::"RevenueLogType"`);
const PAID_ORDER_STATUS_SQL = Prisma.raw(`'PAID'::"OrderStatus"`);
const REPORT_GROUP_LABELS: Record<ReportGroupBy, string> = {
  day: 'Theo ngày',
  week: 'Theo tuần',
  month: 'Theo tháng',
  quarter: 'Theo quý',
  year: 'Theo năm',
};
const REPORT_GROUP_FILENAME_LABELS: Record<ReportGroupBy, string> = {
  day: 'theo-ngay',
  week: 'theo-tuan',
  month: 'theo-thang',
  quarter: 'theo-quy',
  year: 'theo-nam',
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueReport(query: RevenueReportQueryDto) {
    return this.buildRevenueReport(query);
  }

  async exportRevenueReport(query: RevenueReportQueryDto) {
    const report = await this.buildRevenueReport(query);

    const summaryRows = [
      ['Thời gian xuất báo cáo', this.formatDateTime(new Date())],
      ['Kiểu thống kê', this.getGroupByLabel(report.groupBy)],
      ['Từ ngày', this.formatDateTime(report.summary.from)],
      ['Đến ngày', this.formatDateTime(report.summary.to)],
      ['Doanh thu thuần', this.toNumber(report.summary.totalRevenue)],
      ['Doanh thu bán hàng', this.toNumber(report.summary.salesRevenue)],
      ['Điều chỉnh doanh thu', this.toNumber(report.summary.adjustmentRevenue)],
      ['Số bút toán', report.summary.totalEntries],
      ['Số mặt hàng đã bán', report.summary.totalProductsSold],
      ['Tổng số lượng bán', report.summary.totalUnitsSold],
      ['Tạm tính', this.toNumber(report.summary.totalSubtotal)],
      ['Giảm giá', this.toNumber(report.summary.totalDiscount)],
      ['Cơ sở tính thuế', this.toNumber(report.summary.totalTaxable)],
      ['Thuế', this.toNumber(report.summary.totalTax)],
      ['Tổng thu trong kỳ', this.toNumber(report.summary.grossCollections)],
    ];

    const detailRows = report.items.map((item) => ({
      'Kỳ báo cáo': this.formatPeriodLabel(item.period, report.groupBy),
      'Mốc bắt đầu kỳ': this.formatDateTime(item.period),
      'Số bút toán': item.entries,
      'Doanh thu bán hàng': this.toNumber(item.salesRevenue),
      'Điều chỉnh doanh thu': this.toNumber(item.adjustmentRevenue),
      'Doanh thu thuần': this.toNumber(item.total),
    }));
    const productRows = report.products.map((item) => ({
      SKU: item.sku,
      'Tên sản phẩm': item.productName,
      'Đơn vị': item.unit,
      'Số lượng bán': item.quantitySold,
      'Số đơn': item.ordersCount,
      'Tạm tính': this.toNumber(item.subtotal),
      'Giảm giá': this.toNumber(item.discountAmount),
      Thuế: this.toNumber(item.taxAmount),
      'Doanh thu thuần': this.toNumber(item.totalRevenue),
    }));

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    const productSheet = XLSX.utils.json_to_sheet(productRows);

    summarySheet['!cols'] = [{ wch: 22 }, { wch: 24 }];
    detailSheet['!cols'] = [
      { wch: 24 },
      { wch: 28 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    productSheet['!cols'] = [
      { wch: 16 },
      { wch: 32 },
      { wch: 10 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Chi tiết');
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Sản phẩm bán ra');

    return {
      buffer: XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer',
      }),
      filename: this.buildFilename(report.groupBy),
    };
  }

  private async buildRevenueReport(query: RevenueReportQueryDto) {
    const groupBy = query.groupBy ?? 'day';
    const to = this.parseDate(query.to) ?? new Date();
    const from =
      this.parseDate(query.from) ?? this.getDefaultFromDate(groupBy, to);

    if (from > to) {
      throw new BadRequestException(
        '`from` must be earlier than or equal to `to`',
      );
    }

    const config = REPORT_GROUP_CONFIG[groupBy];

    const [summary, grouped, productRows, taxSummary] = await Promise.all([
      this.prisma.revenueLog.groupBy({
        by: ['type'],
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.$queryRaw<RevenueRow[]>(Prisma.sql`
        WITH periods AS (
          SELECT generate_series(
            date_trunc(${config.trunc}, ${from}),
            date_trunc(${config.trunc}, ${to}),
            ${config.step}
          ) AS period
        )
        SELECT
          periods.period AS period,
          COALESCE(SUM(rl.amount), 0) AS total,
          COALESCE(
            SUM(
              CASE
                WHEN rl.type = ${SALE_LOG_TYPE_SQL} THEN rl.amount
                ELSE 0
              END
            ),
            0
          ) AS "salesRevenue",
          COALESCE(
            SUM(
              CASE
                WHEN rl.type = ${ADJUSTMENT_LOG_TYPE_SQL} THEN rl.amount
                ELSE 0
              END
            ),
            0
          ) AS "adjustmentRevenue",
          COUNT(rl.id)::int AS entries
        FROM periods
        LEFT JOIN revenue_logs rl
          ON date_trunc(${config.trunc}, rl."createdAt") = periods.period
         AND rl."createdAt" >= ${from}
         AND rl."createdAt" <= ${to}
        GROUP BY periods.period
        ORDER BY periods.period ASC
      `),
      this.prisma.$queryRaw<ProductSalesRow[]>(Prisma.sql`
        SELECT
          oi."productId" AS "productId",
          oi.sku,
          oi."productName" AS "productName",
          oi.unit,
          COALESCE(SUM(oi.quantity), 0)::int AS "quantitySold",
          COUNT(DISTINCT oi."orderId")::int AS "ordersCount",
          COALESCE(SUM(oi."lineSubtotal"), 0) AS subtotal,
          COALESCE(SUM(oi."discountAmount"), 0) AS "discountAmount",
          COALESCE(SUM(oi."taxAmount"), 0) AS "taxAmount",
          COALESCE(SUM(oi."lineTotal"), 0) AS "totalRevenue"
        FROM order_items oi
        INNER JOIN orders o
          ON o.id = oi."orderId"
        WHERE o.status = ${PAID_ORDER_STATUS_SQL}
          AND o."paidAt" >= ${from}
          AND o."paidAt" <= ${to}
        GROUP BY oi."productId", oi.sku, oi."productName", oi.unit
        ORDER BY "totalRevenue" DESC, "quantitySold" DESC, oi."productName" ASC
      `),
      this.prisma.order.aggregate({
        where: {
          paidAt: {
            gte: from,
            lte: to,
          },
        },
        _sum: {
          subtotal: true,
          discount: true,
          taxableTotal: true,
          tax: true,
          total: true,
        },
      }),
    ]);

    const saleSummary = summary.find(
      (item) => item.type === RevenueLogType.SALE,
    );
    const adjustmentSummary = summary.find(
      (item) => item.type === RevenueLogType.ADJUSTMENT,
    );
    const totalRevenue = (
      saleSummary?._sum.amount ?? new Prisma.Decimal(0)
    ).add(adjustmentSummary?._sum.amount ?? new Prisma.Decimal(0));
    const totalUnitsSold = productRows.reduce(
      (sum, item) => sum + item.quantitySold,
      0,
    );

    return {
      groupBy,
      summary: {
        totalRevenue,
        salesRevenue: saleSummary?._sum.amount ?? new Prisma.Decimal(0),
        adjustmentRevenue:
          adjustmentSummary?._sum.amount ?? new Prisma.Decimal(0),
        totalEntries:
          (saleSummary?._count ?? 0) + (adjustmentSummary?._count ?? 0),
        totalSubtotal: taxSummary._sum.subtotal ?? new Prisma.Decimal(0),
        totalDiscount: taxSummary._sum.discount ?? new Prisma.Decimal(0),
        totalTaxable: taxSummary._sum.taxableTotal ?? new Prisma.Decimal(0),
        totalTax: taxSummary._sum.tax ?? new Prisma.Decimal(0),
        grossCollections: taxSummary._sum.total ?? new Prisma.Decimal(0),
        totalProductsSold: productRows.length,
        totalUnitsSold,
        from,
        to,
      },
      items: grouped.map((item) => ({
        period: item.period,
        total: item.total,
        salesRevenue: item.salesRevenue,
        adjustmentRevenue: item.adjustmentRevenue,
        entries: item.entries,
      })),
      products: productRows,
    };
  }

  private parseDate(value?: string) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date value: ${value}`);
    }

    return date;
  }

  private getDefaultFromDate(groupBy: ReportGroupBy, to: Date) {
    const from = new Date(to);

    switch (groupBy) {
      case 'day':
        from.setDate(from.getDate() - 29);
        break;
      case 'week':
        from.setDate(from.getDate() - 7 * 11);
        break;
      case 'month':
        from.setMonth(from.getMonth() - 11);
        break;
      case 'quarter':
        from.setMonth(from.getMonth() - 3 * 7);
        break;
      case 'year':
        from.setFullYear(from.getFullYear() - 4);
        break;
    }

    return from;
  }

  private buildFilename(groupBy: ReportGroupBy) {
    const stamp = new Intl.DateTimeFormat('sv-SE', {
      timeZone: REPORT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date())
      .replaceAll('-', '');

    return `bao-cao-doanh-thu-${REPORT_GROUP_FILENAME_LABELS[groupBy]}-${stamp}.xlsx`;
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: REPORT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  }

  private formatPeriodLabel(value: Date, groupBy: ReportGroupBy) {
    const dayFormatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: REPORT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const monthFormatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: REPORT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
    });
    const yearFormatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: REPORT_TIME_ZONE,
      year: 'numeric',
    });

    if (groupBy === 'day') {
      return dayFormatter.format(value);
    }

    if (groupBy === 'week') {
      return `Tuần bắt đầu ${dayFormatter.format(value)}`;
    }

    if (groupBy === 'month') {
      return `Tháng ${monthFormatter.format(value)}`;
    }

    if (groupBy === 'quarter') {
      const quarter = Math.floor(value.getMonth() / 3) + 1;
      return `Quý ${quarter}/${value.getFullYear()}`;
    }

    return `Năm ${yearFormatter.format(value)}`;
  }

  private getGroupByLabel(groupBy: ReportGroupBy) {
    return REPORT_GROUP_LABELS[groupBy];
  }

  private toNumber(value: Prisma.Decimal | number) {
    if (typeof value === 'number') {
      return value;
    }

    return Number(value.toString());
  }
}
