import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryLogType, Prisma, TaxCategory } from '@prisma/client';
import * as XLSX from 'xlsx';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { getTaxRateByCategory } from '../common/tax/tax.utils';
import { CreateProductGroupDto } from './dto/create-product-group.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ExportProductsDto } from './dto/export-products.dto';
import { ListProductGroupsDto } from './dto/list-product-groups.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdateProductGroupDto } from './dto/update-product-group.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;
const PRODUCT_EXPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const productInclude = Prisma.validator<Prisma.ProductInclude>()({
  inventory: true,
  productGroup: true,
});

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
      const productGroupId = await this.resolveProductGroupId(tx, dto);
      const product = await tx.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          productGroupId,
          barcode: dto.barcode,
          description: dto.description,
          unit: dto.unit ?? 'item',
          price: new Prisma.Decimal(dto.price),
          costPrice:
            dto.costPrice !== undefined
              ? new Prisma.Decimal(dto.costPrice)
              : null,
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
        include: productInclude,
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
            productGroupId: product.productGroupId,
            productGroupName: product.productGroup?.name,
          },
        },
        tx,
      );

      return product;
    });
  }

  async findGroups(query: ListProductGroupsDto = {}) {
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

  async createGroup(dto: CreateProductGroupDto, actorId: string) {
    const name = this.normalizeProductGroupName(dto.name);
    if (!name) {
      throw new BadRequestException('Product group name is required');
    }

    const existing = await this.prisma.productGroup.findUnique({
      where: { name },
    });
    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Product group already exists');
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

  async updateGroup(
    id: string,
    dto: UpdateProductGroupDto,
    actorId: string,
  ) {
    const productGroup = await this.prisma.productGroup.findUnique({
      where: { id },
    });

    if (!productGroup) {
      throw new NotFoundException('Product group not found');
    }

    const nextName =
      dto.name !== undefined
        ? this.normalizeProductGroupName(dto.name)
        : productGroup.name;
    if (!nextName) {
      throw new BadRequestException('Product group name is required');
    }

    const existing = await this.prisma.productGroup.findUnique({
      where: { name: nextName },
    });
    if (existing && existing.id !== id) {
      throw new ConflictException('Product group already exists');
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

  async removeGroup(id: string, actorId: string) {
    const productGroup = await this.prisma.productGroup.findUnique({
      where: { id },
    });

    if (!productGroup) {
      throw new NotFoundException('Product group not found');
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

  async exportProducts(query: ExportProductsDto) {
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

  async search(query: SearchProductsDto) {
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_SEARCH_LIMIT, 1),
      MAX_SEARCH_LIMIT,
    );
    const offset = Math.max(query.offset ?? 0, 0);
    const keyword = query.q?.trim();
    const where: Prisma.ProductWhereInput = {
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

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, actorId: string) {
    const product = await this.findOne(id);
    const nextTaxCategory = dto.taxCategory ?? product.taxCategory;
    const productGroupId = await this.resolveProductGroupId(
      this.prisma,
      dto,
      product.productGroupId,
    );

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        sku: dto.sku ?? product.sku,
        name: dto.name ?? product.name,
        productGroupId,
        barcode: dto.barcode ?? product.barcode,
        description: dto.description ?? product.description,
        unit: dto.unit ?? product.unit,
        price:
          dto.price !== undefined
            ? new Prisma.Decimal(dto.price)
            : product.price,
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

  async remove(id: string, actorId: string) {
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

  private buildExportWhere(query: ExportProductsDto) {
    const keyword = query.q?.trim();
    const unit = query.unit?.trim();
    const productGroupId = query.productGroupId?.trim();
    const createdFrom = this.parseDateStart(query.createdFrom);
    const createdTo = this.parseDateEnd(query.createdTo);
    const where: Prisma.ProductWhereInput = {
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

  private filterProductsForExport(
    products: Awaited<ReturnType<ProductService['findAll']>>,
    query: ExportProductsDto,
  ) {
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

  private async resolveProductGroupId(
    client: Prisma.TransactionClient | PrismaService,
    dto: Pick<CreateProductDto, 'productGroupId' | 'productGroupName'>,
    fallbackId: string | null = null,
  ) {
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
        throw new NotFoundException('Product group not found');
      }

      return productGroup.id;
    }

    return fallbackId;
  }

  private normalizeProductGroupName(value?: string | null) {
    return value?.trim().replace(/\s+/g, ' ') ?? '';
  }

  private getProductGroupExportLabel(
    products: Awaited<ReturnType<ProductService['findAll']>>,
    productGroupId?: string,
  ) {
    if (!productGroupId) {
      return 'Tất cả';
    }

    return (
      products.find((product) => product.productGroupId === productGroupId)
        ?.productGroup?.name ?? productGroupId
    );
  }

  private parseSelectedIds(value?: string) {
    return (
      value
        ?.split(',')
        .map((item) => item.trim())
        .filter(Boolean) ?? []
    );
  }

  private parseDateStart(value?: string) {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseDateEnd(value?: string) {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private buildExportFilename() {
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

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: PRODUCT_EXPORT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  }

  private getStockFilterLabel(value?: ExportProductsDto['stock']) {
    if (value === 'IN_STOCK') {
      return 'Còn hàng';
    }

    if (value === 'OUT_OF_STOCK') {
      return 'Hết hàng';
    }

    return 'Tất cả';
  }

  private getActiveFilterLabel(value?: ExportProductsDto['active']) {
    if (value === 'YES') {
      return 'Có';
    }

    if (value === 'NO') {
      return 'Không';
    }

    return 'Tất cả';
  }

  private toNumber(value: Prisma.Decimal | number) {
    if (typeof value === 'number') {
      return value;
    }

    return Number(value.toString());
  }
}
