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
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const audit_log_service_1 = require("../audit-log/audit-log.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
const tax_utils_1 = require("../common/tax/tax.utils");
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;
const PRODUCT_EXPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const productInclude = client_1.Prisma.validator()({
    inventory: true,
    productGroup: true,
});
let ProductService = class ProductService {
    prisma;
    auditLogService;
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    async create(dto, actorId) {
        const taxCategory = dto.taxCategory ?? client_1.TaxCategory.NO_VAT;
        const existing = await this.prisma.product.findFirst({
            where: {
                OR: [
                    { sku: dto.sku },
                    dto.barcode ? { barcode: dto.barcode } : undefined,
                ].filter(Boolean),
            },
        });
        if (existing) {
            throw new common_1.ConflictException('SKU or barcode already exists');
        }
        return this.prisma.$transaction(async (tx) => {
            const productGroupId = await this.resolveProductGroupId(tx, dto);
            const product = await tx.product.create({
                data: {
                    sku: dto.sku,
                    name: dto.name,
                    productGroupId,
                    barcode: dto.barcode,
                    description: dto.description,
                    unit: dto.unit ?? 'item',
                    price: new client_1.Prisma.Decimal(dto.price),
                    costPrice: dto.costPrice !== undefined
                        ? new client_1.Prisma.Decimal(dto.costPrice)
                        : null,
                    discountAmount: new client_1.Prisma.Decimal(dto.discountAmount ?? 0),
                    discountPercent: new client_1.Prisma.Decimal(dto.discountPercent ?? 0),
                    taxCategory,
                    taxRate: (0, tax_utils_1.getTaxRateByCategory)(taxCategory),
                    inventory: {
                        create: {
                            quantity: dto.initialStock ?? 0,
                            minStock: dto.minStock ?? 0,
                        },
                    },
                },
                include: productInclude,
            });
            if ((dto.initialStock ?? 0) > 0 && product.inventory) {
                await tx.inventoryLog.create({
                    data: {
                        inventoryId: product.inventory.id,
                        productId: product.id,
                        type: client_1.InventoryLogType.INITIAL,
                        delta: dto.initialStock ?? 0,
                        quantityBefore: 0,
                        quantityAfter: dto.initialStock ?? 0,
                        note: 'Initial stock on product creation',
                        createdById: actorId,
                    },
                });
            }
            await this.auditLogService.create({
                actorId,
                entityType: 'Product',
                entityId: product.id,
                action: 'product.create',
                metadata: {
                    sku: product.sku,
                    price: product.price.toString(),
                    discountAmount: product.discountAmount.toString(),
                    discountPercent: product.discountPercent.toString(),
                    taxCategory: product.taxCategory,
                    taxRate: product.taxRate.toString(),
                    initialStock: dto.initialStock ?? 0,
                    productGroupId: product.productGroupId,
                    productGroupName: product.productGroup?.name,
                },
            }, tx);
            return product;
        });
    }
    async findGroups(query = {}) {
        return this.prisma.productGroup.findMany({
            where: query.includeInactive ? undefined : { isActive: true },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        });
    }
    async createGroup(dto, actorId) {
        const name = this.normalizeProductGroupName(dto.name);
        if (!name) {
            throw new common_1.BadRequestException('Product group name is required');
        }
        const existing = await this.prisma.productGroup.findUnique({
            where: { name },
        });
        if (existing) {
            if (existing.isActive) {
                throw new common_1.ConflictException('Product group already exists');
            }
            const reactivated = await this.prisma.productGroup.update({
                where: { id: existing.id },
                data: {
                    description: dto.description?.trim() || existing.description,
                    isActive: true,
                },
                include: {
                    _count: {
                        select: {
                            products: true,
                        },
                    },
                },
            });
            await this.auditLogService.create({
                actorId,
                entityType: 'ProductGroup',
                entityId: reactivated.id,
                action: 'product_group.reactivate',
                metadata: {
                    name: reactivated.name,
                },
            });
            return reactivated;
        }
        const productGroup = await this.prisma.productGroup.create({
            data: {
                name,
                description: dto.description?.trim() || null,
            },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });
        await this.auditLogService.create({
            actorId,
            entityType: 'ProductGroup',
            entityId: productGroup.id,
            action: 'product_group.create',
            metadata: {
                name: productGroup.name,
            },
        });
        return productGroup;
    }
    async updateGroup(id, dto, actorId) {
        const productGroup = await this.prisma.productGroup.findUnique({
            where: { id },
        });
        if (!productGroup) {
            throw new common_1.NotFoundException('Product group not found');
        }
        const nextName = dto.name !== undefined
            ? this.normalizeProductGroupName(dto.name)
            : productGroup.name;
        if (!nextName) {
            throw new common_1.BadRequestException('Product group name is required');
        }
        const existing = await this.prisma.productGroup.findUnique({
            where: { name: nextName },
        });
        if (existing && existing.id !== id) {
            throw new common_1.ConflictException('Product group already exists');
        }
        const updated = await this.prisma.productGroup.update({
            where: { id },
            data: {
                name: nextName,
                ...(dto.description !== undefined
                    ? { description: dto.description.trim() || null }
                    : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });
        await this.auditLogService.create({
            actorId,
            entityType: 'ProductGroup',
            entityId: id,
            action: 'product_group.update',
            metadata: {
                before: {
                    name: productGroup.name,
                    description: productGroup.description,
                    isActive: productGroup.isActive,
                },
                after: {
                    name: updated.name,
                    description: updated.description,
                    isActive: updated.isActive,
                },
            },
        });
        return updated;
    }
    async removeGroup(id, actorId) {
        const productGroup = await this.prisma.productGroup.findUnique({
            where: { id },
        });
        if (!productGroup) {
            throw new common_1.NotFoundException('Product group not found');
        }
        const updated = await this.prisma.productGroup.update({
            where: { id },
            data: { isActive: false },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });
        await this.auditLogService.create({
            actorId,
            entityType: 'ProductGroup',
            entityId: id,
            action: 'product_group.deactivate',
            metadata: {
                name: productGroup.name,
            },
        });
        return updated;
    }
    async findAll() {
        return this.prisma.product.findMany({
            include: productInclude,
            orderBy: { createdAt: 'desc' },
        });
    }
    async exportProducts(query) {
        const selectedIds = this.parseSelectedIds(query.ids);
        const hasSelectedIds = selectedIds.length > 0;
        const products = await this.prisma.product.findMany({
            where: hasSelectedIds
                ? {
                    id: { in: selectedIds },
                }
                : this.buildExportWhere(query),
            include: productInclude,
            orderBy: [{ name: 'asc' }, { sku: 'asc' }, { createdAt: 'desc' }],
        });
        const exportProducts = hasSelectedIds
            ? products
            : this.filterProductsForExport(products, query);
        const summaryRows = [
            ['Thời gian xuất file', this.formatDateTime(new Date())],
            ['Số hàng hóa', exportProducts.length],
            ['Nguồn dữ liệu', hasSelectedIds ? 'Hàng đã chọn' : 'Theo bộ lọc'],
            ['Từ khóa', query.q?.trim() || 'Tất cả'],
            ['Trạng thái tồn kho', this.getStockFilterLabel(query.stock)],
            ['Bán trực tiếp', this.getActiveFilterLabel(query.active)],
            [
                'Nhóm hàng hóa',
                this.getProductGroupExportLabel(exportProducts, query.productGroupId),
            ],
            ['Đơn vị', query.unit?.trim() || 'Tất cả'],
        ];
        const productRows = exportProducts.map((product) => ({
            'Mã hàng': product.sku,
            'Tên hàng': product.name,
            'Nhóm hàng hóa': product.productGroup?.name ?? '',
            Barcode: product.barcode ?? '',
            'Đơn vị': product.unit,
            'Giá bán': this.toNumber(product.price),
            'Giá vốn': product.costPrice ? this.toNumber(product.costPrice) : 0,
            'Giảm tiền': this.toNumber(product.discountAmount),
            'Giảm %': this.toNumber(product.discountPercent),
            'Nhóm thuế': product.taxCategory,
            'Thuế %': this.toNumber(product.taxRate),
            'Tồn kho': product.inventory?.quantity ?? 0,
            'Tồn tối thiểu': product.inventory?.minStock ?? 0,
            'Trạng thái': product.isActive ? 'Đang bán' : 'Ngưng bán',
            'Thời gian tạo': this.formatDateTime(product.createdAt),
            'Cập nhật lúc': this.formatDateTime(product.updatedAt),
            'Mô tả': product.description ?? '',
        }));
        const workbook = XLSX.utils.book_new();
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        const productSheet = XLSX.utils.json_to_sheet(productRows);
        summarySheet['!cols'] = [{ wch: 22 }, { wch: 32 }];
        productSheet['!cols'] = [
            { wch: 18 },
            { wch: 34 },
            { wch: 22 },
            { wch: 18 },
            { wch: 10 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 },
            { wch: 10 },
            { wch: 12 },
            { wch: 10 },
            { wch: 10 },
            { wch: 13 },
            { wch: 12 },
            { wch: 18 },
            { wch: 18 },
            { wch: 40 },
        ];
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');
        XLSX.utils.book_append_sheet(workbook, productSheet, 'Hàng hóa');
        return {
            buffer: XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'buffer',
            }),
            filename: this.buildExportFilename(),
        };
    }
    async search(query) {
        const limit = Math.min(Math.max(query.limit ?? DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT);
        const offset = Math.max(query.offset ?? 0, 0);
        const keyword = query.q?.trim();
        const where = {
            isActive: true,
            ...(query.inStockOnly
                ? {
                    inventory: {
                        is: {
                            quantity: { gt: 0 },
                        },
                    },
                }
                : {}),
            ...(keyword
                ? {
                    OR: [
                        { name: { contains: keyword, mode: 'insensitive' } },
                        {
                            productGroup: {
                                is: { name: { contains: keyword, mode: 'insensitive' } },
                            },
                        },
                        { sku: { contains: keyword, mode: 'insensitive' } },
                        { barcode: { contains: keyword, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const rows = await this.prisma.product.findMany({
            where,
            include: productInclude,
            orderBy: [{ name: 'asc' }, { sku: 'asc' }, { createdAt: 'desc' }],
            skip: offset,
            take: limit + 1,
        });
        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;
        return {
            items,
            hasMore,
            nextOffset: hasMore ? offset + limit : null,
        };
    }
    async findOne(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: productInclude,
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async update(id, dto, actorId) {
        const product = await this.findOne(id);
        const nextTaxCategory = dto.taxCategory ?? product.taxCategory;
        const productGroupId = await this.resolveProductGroupId(this.prisma, dto, product.productGroupId);
        const updated = await this.prisma.product.update({
            where: { id },
            data: {
                sku: dto.sku ?? product.sku,
                name: dto.name ?? product.name,
                productGroupId,
                barcode: dto.barcode ?? product.barcode,
                description: dto.description ?? product.description,
                unit: dto.unit ?? product.unit,
                price: dto.price !== undefined
                    ? new client_1.Prisma.Decimal(dto.price)
                    : product.price,
                costPrice: dto.costPrice !== undefined
                    ? new client_1.Prisma.Decimal(dto.costPrice)
                    : product.costPrice,
                discountAmount: dto.discountAmount !== undefined
                    ? new client_1.Prisma.Decimal(dto.discountAmount)
                    : product.discountAmount,
                discountPercent: dto.discountPercent !== undefined
                    ? new client_1.Prisma.Decimal(dto.discountPercent)
                    : product.discountPercent,
                taxCategory: nextTaxCategory,
                taxRate: (0, tax_utils_1.getTaxRateByCategory)(nextTaxCategory),
            },
            include: productInclude,
        });
        await this.auditLogService.create({
            actorId,
            entityType: 'Product',
            entityId: id,
            action: 'product.update',
            metadata: {
                before: {
                    name: product.name,
                    price: product.price.toString(),
                    discountAmount: product.discountAmount.toString(),
                    discountPercent: product.discountPercent.toString(),
                    sku: product.sku,
                    taxCategory: product.taxCategory,
                    productGroupId: product.productGroupId,
                    productGroupName: product.productGroup?.name,
                },
                after: {
                    name: updated.name,
                    price: updated.price.toString(),
                    discountAmount: updated.discountAmount.toString(),
                    discountPercent: updated.discountPercent.toString(),
                    sku: updated.sku,
                    taxCategory: updated.taxCategory,
                    productGroupId: updated.productGroupId,
                    productGroupName: updated.productGroup?.name,
                },
            },
        });
        return updated;
    }
    async remove(id, actorId) {
        const product = await this.findOne(id);
        const updated = await this.prisma.product.update({
            where: { id },
            data: { isActive: false },
            include: productInclude,
        });
        await this.auditLogService.create({
            actorId,
            entityType: 'Product',
            entityId: id,
            action: 'product.deactivate',
            metadata: {
                sku: product.sku,
            },
        });
        return updated;
    }
    buildExportWhere(query) {
        const keyword = query.q?.trim();
        const unit = query.unit?.trim();
        const productGroupId = query.productGroupId?.trim();
        const createdFrom = this.parseDateStart(query.createdFrom);
        const createdTo = this.parseDateEnd(query.createdTo);
        const where = {
            ...(keyword
                ? {
                    OR: [
                        { name: { contains: keyword, mode: 'insensitive' } },
                        {
                            productGroup: {
                                is: { name: { contains: keyword, mode: 'insensitive' } },
                            },
                        },
                        { sku: { contains: keyword, mode: 'insensitive' } },
                        { barcode: { contains: keyword, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(query.active === 'YES'
                ? { isActive: true }
                : query.active === 'NO'
                    ? { isActive: false }
                    : {}),
            ...(unit ? { unit: { contains: unit, mode: 'insensitive' } } : {}),
            ...(productGroupId ? { productGroupId } : {}),
            ...(query.stock === 'IN_STOCK'
                ? {
                    inventory: {
                        is: {
                            quantity: { gt: 0 },
                        },
                    },
                }
                : query.stock === 'OUT_OF_STOCK'
                    ? {
                        inventory: {
                            is: {
                                quantity: { lte: 0 },
                            },
                        },
                    }
                    : {}),
            ...(createdFrom || createdTo
                ? {
                    createdAt: {
                        ...(createdFrom ? { gte: createdFrom } : {}),
                        ...(createdTo ? { lte: createdTo } : {}),
                    },
                }
                : {}),
        };
        return where;
    }
    filterProductsForExport(products, query) {
        if (query.forecastMode !== 'CUSTOM') {
            return products;
        }
        return products.filter((product) => {
            const quantity = product.inventory?.quantity ?? 0;
            const minStock = product.inventory?.minStock ?? 0;
            return query.forecastLevel === 'OUT'
                ? quantity <= 0
                : quantity <= minStock;
        });
    }
    async resolveProductGroupId(client, dto, fallbackId = null) {
        if (dto.productGroupName !== undefined) {
            const name = this.normalizeProductGroupName(dto.productGroupName);
            if (!name) {
                return null;
            }
            const productGroup = await client.productGroup.upsert({
                where: { name },
                update: { isActive: true },
                create: { name },
            });
            return productGroup.id;
        }
        if (dto.productGroupId !== undefined) {
            const productGroupId = dto.productGroupId.trim();
            if (!productGroupId) {
                return null;
            }
            const productGroup = await client.productGroup.findUnique({
                where: { id: productGroupId },
            });
            if (!productGroup || !productGroup.isActive) {
                throw new common_1.NotFoundException('Product group not found');
            }
            return productGroup.id;
        }
        return fallbackId;
    }
    normalizeProductGroupName(value) {
        return value?.trim().replace(/\s+/g, ' ') ?? '';
    }
    getProductGroupExportLabel(products, productGroupId) {
        if (!productGroupId) {
            return 'Tất cả';
        }
        return (products.find((product) => product.productGroupId === productGroupId)
            ?.productGroup?.name ?? productGroupId);
    }
    parseSelectedIds(value) {
        return (value
            ?.split(',')
            .map((item) => item.trim())
            .filter(Boolean) ?? []);
    }
    parseDateStart(value) {
        if (!value) {
            return null;
        }
        const date = new Date(`${value}T00:00:00`);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    parseDateEnd(value) {
        if (!value) {
            return null;
        }
        const date = new Date(`${value}T23:59:59.999`);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    buildExportFilename() {
        const stamp = new Intl.DateTimeFormat('sv-SE', {
            timeZone: PRODUCT_EXPORT_TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
            .format(new Date())
            .replaceAll('-', '');
        return `hang-hoa-${stamp}.xlsx`;
    }
    formatDateTime(value) {
        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: PRODUCT_EXPORT_TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(value);
    }
    getStockFilterLabel(value) {
        if (value === 'IN_STOCK') {
            return 'Còn hàng';
        }
        if (value === 'OUT_OF_STOCK') {
            return 'Hết hàng';
        }
        return 'Tất cả';
    }
    getActiveFilterLabel(value) {
        if (value === 'YES') {
            return 'Có';
        }
        if (value === 'NO') {
            return 'Không';
        }
        return 'Tất cả';
    }
    toNumber(value) {
        if (typeof value === 'number') {
            return value;
        }
        return Number(value.toString());
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], ProductService);
//# sourceMappingURL=product.service.js.map