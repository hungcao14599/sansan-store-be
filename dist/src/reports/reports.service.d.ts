import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { RevenueReportQueryDto } from './dto/revenue-report-query.dto';
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
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRevenueReport(query: RevenueReportQueryDto): Promise<{
        groupBy: "year" | "week" | "day" | "month" | "quarter";
        summary: {
            totalRevenue: Prisma.Decimal;
            salesRevenue: Prisma.Decimal;
            adjustmentRevenue: Prisma.Decimal;
            totalEntries: number;
            totalSubtotal: Prisma.Decimal;
            totalDiscount: Prisma.Decimal;
            totalTaxable: Prisma.Decimal;
            totalTax: Prisma.Decimal;
            grossCollections: Prisma.Decimal;
            totalProductsSold: number;
            totalUnitsSold: number;
            from: Date;
            to: Date;
        };
        items: {
            period: Date;
            total: Prisma.Decimal;
            salesRevenue: Prisma.Decimal;
            adjustmentRevenue: Prisma.Decimal;
            entries: number;
        }[];
        products: ProductSalesRow[];
    }>;
    exportRevenueReport(query: RevenueReportQueryDto): Promise<{
        buffer: any;
        filename: string;
    }>;
    private buildRevenueReport;
    private parseDate;
    private getDefaultFromDate;
    private buildFilename;
    private formatDateTime;
    private formatPeriodLabel;
    private getGroupByLabel;
    private toNumber;
}
export {};
