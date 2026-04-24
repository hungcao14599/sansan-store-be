import type { Response } from 'express';
import { type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateProductGroupDto } from './dto/create-product-group.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ExportProductsDto } from './dto/export-products.dto';
import { ListProductGroupsDto } from './dto/list-product-groups.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdateProductGroupDto } from './dto/update-product-group.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
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
        price: import("@prisma/client/runtime/library").Decimal;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountPercent: import("@prisma/client/runtime/library").Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: import("@prisma/client/runtime/library").Decimal;
    })[]>;
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
            price: import("@prisma/client/runtime/library").Decimal;
            costPrice: import("@prisma/client/runtime/library").Decimal | null;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountPercent: import("@prisma/client/runtime/library").Decimal;
            taxCategory: import("@prisma/client").$Enums.TaxCategory;
            taxRate: import("@prisma/client/runtime/library").Decimal;
        })[];
        hasMore: boolean;
        nextOffset: number | null;
    }>;
    exportProducts(query: ExportProductsDto, res: Response): Promise<void>;
    findGroups(query: ListProductGroupsDto): Promise<({
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
    createGroup(dto: CreateProductGroupDto, user: AuthenticatedUser): Promise<{
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
    updateGroup(id: string, dto: UpdateProductGroupDto, user: AuthenticatedUser): Promise<{
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
    removeGroup(id: string, user: AuthenticatedUser): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountPercent: import("@prisma/client/runtime/library").Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    create(dto: CreateProductDto, user: AuthenticatedUser): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountPercent: import("@prisma/client/runtime/library").Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(id: string, dto: UpdateProductDto, user: AuthenticatedUser): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountPercent: import("@prisma/client/runtime/library").Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: import("@prisma/client/runtime/library").Decimal;
    }>;
    remove(id: string, user: AuthenticatedUser): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountPercent: import("@prisma/client/runtime/library").Decimal;
        taxCategory: import("@prisma/client").$Enums.TaxCategory;
        taxRate: import("@prisma/client/runtime/library").Decimal;
    }>;
}
