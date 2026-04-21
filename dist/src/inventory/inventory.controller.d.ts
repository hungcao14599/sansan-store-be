import { type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    findAll(): Promise<({
        product: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            sku: string;
            barcode: string | null;
            description: string | null;
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
    adjust(productId: string, dto: AdjustInventoryDto, user: AuthenticatedUser): Promise<{
        product: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            sku: string;
            barcode: string | null;
            description: string | null;
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
