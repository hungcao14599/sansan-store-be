"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
const tax_utils_1 = require("../common/tax/tax.utils");
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;
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
            const product = await tx.product.create({
                data: {
                    sku: dto.sku,
                    name: dto.name,
                    barcode: dto.barcode,
                    description: dto.description,
                    unit: dto.unit ?? 'item',
                    price: new client_1.Prisma.Decimal(dto.price),
                    costPrice: dto.costPrice !== undefined ? new client_1.Prisma.Decimal(dto.costPrice) : null,
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
                include: {
                    inventory: true,
                },
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
                },
            }, tx);
            return product;
        });
    }
    async findAll() {
        return this.prisma.product.findMany({
            include: {
                inventory: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async search(query) {
        const limit = Math.min(Math.max(query.limit ?? DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT);
        const offset = Math.max(query.offset ?? 0, 0);
        const keyword = query.q?.trim();
        const where = {
            isActive: true,
            ...(keyword
                ? {
                    OR: [
                        { name: { contains: keyword, mode: 'insensitive' } },
                        { sku: { contains: keyword, mode: 'insensitive' } },
                        { barcode: { contains: keyword, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const rows = await this.prisma.product.findMany({
            where,
            include: {
                inventory: true,
            },
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
            include: {
                inventory: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async update(id, dto, actorId) {
        const product = await this.findOne(id);
        const nextTaxCategory = dto.taxCategory ?? product.taxCategory;
        const updated = await this.prisma.product.update({
            where: { id },
            data: {
                sku: dto.sku ?? product.sku,
                name: dto.name ?? product.name,
                barcode: dto.barcode ?? product.barcode,
                description: dto.description ?? product.description,
                unit: dto.unit ?? product.unit,
                price: dto.price !== undefined ? new client_1.Prisma.Decimal(dto.price) : product.price,
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
            include: {
                inventory: true,
            },
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
                },
                after: {
                    name: updated.name,
                    price: updated.price.toString(),
                    discountAmount: updated.discountAmount.toString(),
                    discountPercent: updated.discountPercent.toString(),
                    sku: updated.sku,
                    taxCategory: updated.taxCategory,
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
            include: { inventory: true },
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
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], ProductService);
//# sourceMappingURL=product.service.js.map