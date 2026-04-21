"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const prisma_service_1 = require("../common/prisma/prisma.service");
const REPORT_GROUP_CONFIG = {
    day: {
        trunc: client_1.Prisma.raw(`'day'`),
        step: client_1.Prisma.raw(`interval '1 day'`),
    },
    week: {
        trunc: client_1.Prisma.raw(`'week'`),
        step: client_1.Prisma.raw(`interval '1 week'`),
    },
    month: {
        trunc: client_1.Prisma.raw(`'month'`),
        step: client_1.Prisma.raw(`interval '1 month'`),
    },
    quarter: {
        trunc: client_1.Prisma.raw(`'quarter'`),
        step: client_1.Prisma.raw(`interval '3 months'`),
    },
    year: {
        trunc: client_1.Prisma.raw(`'year'`),
        step: client_1.Prisma.raw(`interval '1 year'`),
    },
};
const REPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const SALE_LOG_TYPE_SQL = client_1.Prisma.raw(`'SALE'::"RevenueLogType"`);
const ADJUSTMENT_LOG_TYPE_SQL = client_1.Prisma.raw(`'ADJUSTMENT'::"RevenueLogType"`);
const PAID_ORDER_STATUS_SQL = client_1.Prisma.raw(`'PAID'::"OrderStatus"`);
const REPORT_GROUP_LABELS = {
    day: 'Theo ngày',
    week: 'Theo tuần',
    month: 'Theo tháng',
    quarter: 'Theo quý',
    year: 'Theo năm',
};
const REPORT_GROUP_FILENAME_LABELS = {
    day: 'theo-ngay',
    week: 'theo-tuan',
    month: 'theo-thang',
    quarter: 'theo-quy',
    year: 'theo-nam',
};
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRevenueReport(query) {
        return this.buildRevenueReport(query);
    }
    async exportRevenueReport(query) {
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
    async buildRevenueReport(query) {
        const groupBy = query.groupBy ?? 'day';
        const to = this.parseDate(query.to) ?? new Date();
        const from = this.parseDate(query.from) ?? this.getDefaultFromDate(groupBy, to);
        if (from > to) {
            throw new common_1.BadRequestException('`from` must be earlier than or equal to `to`');
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
            this.prisma.$queryRaw(client_1.Prisma.sql `
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
            this.prisma.$queryRaw(client_1.Prisma.sql `
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
        const saleSummary = summary.find((item) => item.type === client_1.RevenueLogType.SALE);
        const adjustmentSummary = summary.find((item) => item.type === client_1.RevenueLogType.ADJUSTMENT);
        const totalRevenue = (saleSummary?._sum.amount ?? new client_1.Prisma.Decimal(0)).add(adjustmentSummary?._sum.amount ?? new client_1.Prisma.Decimal(0));
        const totalUnitsSold = productRows.reduce((sum, item) => sum + item.quantitySold, 0);
        return {
            groupBy,
            summary: {
                totalRevenue,
                salesRevenue: saleSummary?._sum.amount ?? new client_1.Prisma.Decimal(0),
                adjustmentRevenue: adjustmentSummary?._sum.amount ?? new client_1.Prisma.Decimal(0),
                totalEntries: (saleSummary?._count ?? 0) + (adjustmentSummary?._count ?? 0),
                totalSubtotal: taxSummary._sum.subtotal ?? new client_1.Prisma.Decimal(0),
                totalDiscount: taxSummary._sum.discount ?? new client_1.Prisma.Decimal(0),
                totalTaxable: taxSummary._sum.taxableTotal ?? new client_1.Prisma.Decimal(0),
                totalTax: taxSummary._sum.tax ?? new client_1.Prisma.Decimal(0),
                grossCollections: taxSummary._sum.total ?? new client_1.Prisma.Decimal(0),
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
    parseDate(value) {
        if (!value) {
            return null;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new common_1.BadRequestException(`Invalid date value: ${value}`);
        }
        return date;
    }
    getDefaultFromDate(groupBy, to) {
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
    buildFilename(groupBy) {
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
    formatDateTime(value) {
        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: REPORT_TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(value);
    }
    formatPeriodLabel(value, groupBy) {
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
    getGroupByLabel(groupBy) {
        return REPORT_GROUP_LABELS[groupBy];
    }
    toNumber(value) {
        if (typeof value === 'number') {
            return value;
        }
        return Number(value.toString());
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map