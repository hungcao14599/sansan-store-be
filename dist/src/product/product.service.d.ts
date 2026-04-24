import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProductGroupDto } from './dto/create-product-group.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ExportProductsDto } from './dto/export-products.dto';
import { ListProductGroupsDto } from './dto/list-product-groups.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdateProductGroupDto } from './dto/update-product-group.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductService {
    private readonly prisma;
    private readonly auditLogService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    create(dto: CreateProductDto, actorId: string): Promise<{
        productGroup: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
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
        description: string | null;
        sku: string;
        barcode: string | null;
        productGroupId: string | null;
        unit: string;
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    }>;
    findGroups(query?: ListProductGroupsDto): Promise<({
        _count: {
            products: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    })[]>;
    createGroup(dto: CreateProductGroupDto, actorId: string): Promise<{
        _count: {
            products: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    updateGroup(id: string, dto: UpdateProductGroupDto, actorId: string): Promise<{
        _count: {
            products: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    removeGroup(id: string, actorId: string): Promise<{
        _count: {
            products: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    findAll(): Promise<({
        productGroup: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
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
        description: string | null;
        sku: string;
        barcode: string | null;
        productGroupId: string | null;
        unit: string;
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    })[]>;
    exportProducts(query: ExportProductsDto): Promise<{
        buffer: any;
        filename: string;
    }>;
    search(query: SearchProductsDto): Promise<{
        items: ({
            productGroup: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            } | null;
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
            description: string | null;
            sku: string;
            barcode: string | null;
            productGroupId: string | null;
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
        productGroup: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
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
        description: string | null;
        sku: string;
        barcode: string | null;
        productGroupId: string | null;
        unit: string;
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    }>;
    update(id: string, dto: UpdateProductDto, actorId: string): Promise<{
        productGroup: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
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
        description: string | null;
        sku: string;
        barcode: string | null;
        productGroupId: string | null;
        unit: string;
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    }>;
    remove(id: string, actorId: string): Promise<{
        productGroup: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
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
        description: string | null;
        sku: string;
        barcode: string | null;
        productGroupId: string | null;
        unit: string;
        price: Prisma.Decimal;
        costPrice: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: Prisma.Decimal;
    }>;
    private buildExportWhere;
    private filterProductsForExport;
    private resolveProductGroupId;
    private normalizeProductGroupName;
    private getProductGroupExportLabel;
    private parseSelectedIds;
    private parseDateStart;
    private parseDateEnd;
    private buildExportFilename;
    private formatDateTime;
    private getStockFilterLabel;
    private getActiveFilterLabel;
    private toNumber;
}
