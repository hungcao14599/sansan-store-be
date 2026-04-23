import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryLogType, Prisma, TaxCategory } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { getTaxRateByCategory } from '../common/tax/tax.utils';
import { CreateProductDto } from './dto/create-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateProductDto, actorId: string) {
    const taxCategory = dto.taxCategory ?? TaxCategory.NO_VAT;

    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [
          { sku: dto.sku },
          dto.barcode ? { barcode: dto.barcode } : undefined,
        ].filter(Boolean) as Prisma.ProductWhereInput[],
      },
    });

    if (existing) {
      throw new ConflictException('SKU or barcode already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          barcode: dto.barcode,
          description: dto.description,
          unit: dto.unit ?? 'item',
          price: new Prisma.Decimal(dto.price),
          costPrice:
            dto.costPrice !== undefined ? new Prisma.Decimal(dto.costPrice) : null,
          discountAmount: new Prisma.Decimal(dto.discountAmount ?? 0),
          discountPercent: new Prisma.Decimal(dto.discountPercent ?? 0),
          taxCategory,
          taxRate: getTaxRateByCategory(taxCategory),
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
            type: InventoryLogType.INITIAL,
            delta: dto.initialStock ?? 0,
            quantityBefore: 0,
            quantityAfter: dto.initialStock ?? 0,
            note: 'Initial stock on product creation',
            createdById: actorId,
          },
        });
      }

      await this.auditLogService.create(
        {
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
        },
        tx,
      );

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

  async search(query: SearchProductsDto) {
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_SEARCH_LIMIT, 1),
      MAX_SEARCH_LIMIT,
    );
    const offset = Math.max(query.offset ?? 0, 0);
    const keyword = query.q?.trim();
    const where: Prisma.ProductWhereInput = {
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

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, actorId: string) {
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
        price:
          dto.price !== undefined ? new Prisma.Decimal(dto.price) : product.price,
        costPrice:
          dto.costPrice !== undefined
            ? new Prisma.Decimal(dto.costPrice)
            : product.costPrice,
        discountAmount:
          dto.discountAmount !== undefined
            ? new Prisma.Decimal(dto.discountAmount)
            : product.discountAmount,
        discountPercent:
          dto.discountPercent !== undefined
            ? new Prisma.Decimal(dto.discountPercent)
            : product.discountPercent,
        taxCategory: nextTaxCategory,
        taxRate: getTaxRateByCategory(nextTaxCategory),
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

  async remove(id: string, actorId: string) {
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
}
