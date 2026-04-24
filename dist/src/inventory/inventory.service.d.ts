import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
export declare class InventoryService {
    private readonly prisma;
    private readonly auditLogService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    findAll(): Promise<({
        product: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            sku: string;
            barcode: string | null;
            productGroupId: string | null;
            unit: string;
            price: import("@prisma/client/runtime/library").Decimal;
            costPrice: import("@prisma/client/runtime/library").Decimal | null;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountPercent: import("@prisma/client/runtime/library").Decimal;
            taxCategory: import("@prisma/client").$Enums.TaxCategory;
            taxRate: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        quantity: number;
        minStock: number;
    })[]>;
    adjust(productId: string, dto: AdjustInventoryDto, actorId: string): Promise<{
        product: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            sku: string;
            barcode: string | null;
            productGroupId: string | null;
            unit: string;
            price: import("@prisma/client/runtime/library").Decimal;
            costPrice: import("@prisma/client/runtime/library").Decimal | null;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountPercent: import("@prisma/client/runtime/library").Decimal;
            taxCategory: import("@prisma/client").$Enums.TaxCategory;
            taxRate: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        quantity: number;
        minStock: number;
    }>;
}
