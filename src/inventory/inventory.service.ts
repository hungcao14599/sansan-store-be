import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryLogType } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.inventory.findMany({
      include: {
        product: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async adjust(productId: string, dto: AdjustInventoryDto, actorId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
      include: { product: true },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    const nextQuantity = inventory.quantity + dto.delta;
    if (nextQuantity < 0) {
      throw new BadRequestException('Inventory cannot be negative');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: nextQuantity,
          minStock: dto.minStock ?? inventory.minStock,
        },
        include: {
          product: true,
        },
      });

      await tx.inventoryLog.create({
        data: {
          inventoryId: inventory.id,
          productId: inventory.productId,
          type:
            dto.type === 'RESTOCK'
              ? InventoryLogType.RESTOCK
              : InventoryLogType.ADJUSTMENT,
          delta: dto.delta,
          quantityBefore: inventory.quantity,
          quantityAfter: nextQuantity,
          note: dto.note,
          createdById: actorId,
        },
      });

      await this.auditLogService.create(
        {
          actorId,
          entityType: 'Inventory',
          entityId: inventory.id,
          action: 'inventory.adjust',
          metadata: {
            productId,
            type: dto.type,
            delta: dto.delta,
            before: inventory.quantity,
            after: nextQuantity,
          },
        },
        tx,
      );

      return updated;
    });
  }
}
