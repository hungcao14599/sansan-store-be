import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductService {
    private readonly prisma;
    private readonly auditLogService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    create(dto: CreateProductDto, actorId: string): Promise<{
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
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    }>;
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
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    })[]>;
    search(query: SearchProductsDto): Promise<{
        items: ({
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
            price: Prisma.Decimal;
            costPrice: Prisma.Decimal | null;
            discountAmount: Prisma.Decimal;
            discountPercent: Prisma.Decimal;
            taxCategory: import("@prisma/client").$Enums.TaxCategory;
            taxRate: Prisma.Decimal;
        })[];
        hasMore: boolean;
        nextOffset: number | null;
    }>;
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
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    }>;
    update(id: string, dto: UpdateProductDto, actorId: string): Promise<{
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
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    }>;
    remove(id: string, actorId: string): Promise<{
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
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    }>;
}
