import { type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    findAll(): Promise<({
        inventory: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            minStock: number;
        } | null;
    } & {
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
    })[]>;
    findOne(id: string): Promise<{
        inventory: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            minStock: number;
        } | null;
    } & {
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
    }>;
    create(dto: CreateProductDto, user: AuthenticatedUser): Promise<{
        inventory: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            minStock: number;
        } | null;
    } & {
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
    }>;
    update(id: string, dto: UpdateProductDto, user: AuthenticatedUser): Promise<{
        inventory: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            minStock: number;
        } | null;
    } & {
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
    }>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        inventory: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            quantity: number;
            minStock: number;
        } | null;
    } & {
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
    }>;
}
