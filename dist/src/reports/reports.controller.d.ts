import type { Response } from 'express';
import { RevenueReportQueryDto } from './dto/revenue-report-query.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    exportRevenue(query: RevenueReportQueryDto, res: Response): Promise<void>;
    getRevenue(query: RevenueReportQueryDto): Promise<{
        groupBy: "year" | "week" | "day" | "month" | "quarter";
        summary: {
            totalRevenue: import("@prisma/client/runtime/library").Decimal;
            salesRevenue: import("@prisma/client/runtime/library").Decimal;
            adjustmentRevenue: import("@prisma/client/runtime/library").Decimal;
            totalEntries: number;
            totalSubtotal: import("@prisma/client/runtime/library").Decimal;
            totalDiscount: import("@prisma/client/runtime/library").Decimal;
            totalTaxable: import("@prisma/client/runtime/library").Decimal;
            totalTax: import("@prisma/client/runtime/library").Decimal;
            grossCollections: import("@prisma/client/runtime/library").Decimal;
            totalProductsSold: number;
            totalUnitsSold: number;
            from: Date;
            to: Date;
        };
        items: {
            period: Date;
            total: import("@prisma/client/runtime/library").Decimal;
            salesRevenue: import("@prisma/client/runtime/library").Decimal;
            adjustmentRevenue: import("@prisma/client/runtime/library").Decimal;
            entries: number;
        }[];
        products: {
            productId: string;
            sku: string;
            productName: string;
            unit: string;
            quantitySold: number;
            ordersCount: number;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            totalRevenue: import("@prisma/client/runtime/library").Decimal;
        }[];
    }>;
}
