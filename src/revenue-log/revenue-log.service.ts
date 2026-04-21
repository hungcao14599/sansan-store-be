import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RevenueLogType } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RevenueLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findByOrderId(orderId: string) {
    return this.prisma.revenueLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createAdjustment(params: {
    orderId: string;
    amount: number;
    reason: string;
    actorId: string;
    adjustmentOfId?: string;
    transaction?: Prisma.TransactionClient;
  }) {
    const client = params.transaction ?? this.prisma;

    const order = await client.order.findUnique({
      where: { id: params.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const adjustment = await client.revenueLog.create({
      data: {
        orderId: params.orderId,
        type: RevenueLogType.ADJUSTMENT,
        amount: new Prisma.Decimal(params.amount),
        reason: params.reason,
        adjustmentOfId: params.adjustmentOfId,
        createdById: params.actorId,
      },
    });

    await this.auditLogService.create(
      {
        actorId: params.actorId,
        entityType: 'RevenueLog',
        entityId: adjustment.id,
        action: 'revenue.adjustment',
        metadata: {
          orderId: params.orderId,
          amount: adjustment.amount.toString(),
          adjustmentOfId: params.adjustmentOfId,
        },
      },
      client,
    );

    return adjustment;
  }
}
