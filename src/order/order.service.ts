import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryLogType,
  InvoiceProvider,
  InvoiceStatus,
  OrderReturnInvoiceAction,
  OrderStatus,
  PaymentMethod,
  PaymentTransactionType,
  Prisma,
  RevenueLogType,
} from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { InvoiceService } from '../invoice/invoice.service';
import { RevenueLogService } from '../revenue-log/revenue-log.service';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderWithItemDto } from './dto/create-order-with-item.dto';
import { CreateRevenueAdjustmentDto } from './dto/create-revenue-adjustment.dto';
import { ReturnPaidOrderDto } from './dto/return-paid-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

type OrderItemPricing = {
  lineSubtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

type CheckoutPricedItem = OrderItemPricing & {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
};

type ReturnPricingContext = {
  quantity: number;
  lineSubtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

type ReturnPricedItem = ReturnPricingContext & {
  orderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  unitPrice: Prisma.Decimal;
  restockedQuantity: number;
};

export type OrderListView = 'detail' | 'summary' | 'pos';

export type FindOrdersOptions = {
  view?: OrderListView;
  status?: OrderStatus;
};

const orderCreatorSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  fullName: true,
  email: true,
});

const orderDetailInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  createdBy: {
    select: orderCreatorSelect,
  },
  revenueLogs: {
    orderBy: { createdAt: 'asc' },
  },
  invoice: true,
  paymentTransactions: {
    orderBy: { createdAt: 'desc' },
  },
  returns: {
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
      },
      createdBy: {
        select: orderCreatorSelect,
      },
    },
    orderBy: { createdAt: 'desc' },
  },
});

const orderPosInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
});

const orderSummarySelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  orderNumber: true,
  status: true,
  subtotal: true,
  discount: true,
  taxableTotal: true,
  tax: true,
  total: true,
  notes: true,
  customerName: true,
  createdById: true,
  paidAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  _count: {
    select: {
      items: true,
    },
  },
  invoice: {
    select: {
      id: true,
      orderId: true,
      provider: true,
      status: true,
      externalReference: true,
      invoiceSeries: true,
      invoiceTemplateCode: true,
      providerStatusMessage: true,
      createdAt: true,
    },
  },
  returns: {
    select: {
      id: true,
      orderId: true,
      returnNumber: true,
      reason: true,
      subtotal: true,
      discount: true,
      taxableTotal: true,
      tax: true,
      total: true,
      invoiceAction: true,
      invoiceNote: true,
      createdAt: true,
      _count: {
        select: {
          items: true,
        },
      },
      createdBy: {
        select: orderCreatorSelect,
      },
    },
    orderBy: { createdAt: 'desc' },
  },
});

type OrderSummaryRow = Prisma.OrderGetPayload<{
  select: typeof orderSummarySelect;
}>;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly revenueLogService: RevenueLogService,
    private readonly invoiceService: InvoiceService,
  ) {}

  async create(dto: CreateOrderDto, actorId: string) {
    const orderNumber = await this.generateOrderNumber();
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerName: dto.customerName,
        notes: dto.notes,
        createdById: actorId,
      },
      include: {
        items: true,
        paymentTransactions: true,
      },
    });

    await this.auditLogService.create({
      actorId,
      entityType: 'Order',
      entityId: order.id,
      action: 'order.create',
      metadata: {
        orderNumber: order.orderNumber,
      },
    });

    return order;
  }

  async createWithItem(dto: CreateOrderWithItemDto, actorId: string) {
    const [orderNumber, product] = await Promise.all([
      this.generateOrderNumber(),
      this.prisma.product.findUnique({
        where: { id: dto.productId },
        include: { inventory: true },
      }),
    ]);

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    if ((product.inventory?.quantity ?? 0) <= 0) {
      throw new BadRequestException(
        `Sản phẩm ${product.name} đã hết hàng, không thể thêm vào hóa đơn`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: dto.customerName,
          notes: dto.notes,
          createdById: actorId,
        },
      });
      const pricing = this.calculateOrderItemPricing(
        product.price,
        dto.quantity,
        product.taxRate,
      );

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          unitPrice: product.price,
          quantity: dto.quantity,
          taxCategory: product.taxCategory,
          taxRate: product.taxRate,
          lineSubtotal: pricing.lineSubtotal,
          discountAmount: pricing.discountAmount,
          taxableAmount: pricing.taxableAmount,
          taxAmount: pricing.taxAmount,
          lineTotal: pricing.lineTotal,
        },
      });

      const updatedOrder = await this.refreshTotals(tx, order.id);

      await this.auditLogService.create(
        {
          actorId,
          entityType: 'Order',
          entityId: order.id,
          action: 'order.create_with_item',
          metadata: {
            orderNumber,
            productId: product.id,
            sku: product.sku,
            quantity: dto.quantity,
          },
        },
        tx,
      );

      return updatedOrder;
    });
  }

  async findAll(options: FindOrdersOptions = {}) {
    const where = options.status ? { status: options.status } : undefined;
    const orderBy = { createdAt: 'desc' } as const;

    if (options.view === 'pos') {
      return this.prisma.order.findMany({
        where,
        include: orderPosInclude,
        orderBy,
      });
    }

    if (options.view === 'summary') {
      const orders = await this.prisma.order.findMany({
        where,
        select: orderSummarySelect,
        orderBy,
      });

      return orders.map((order) => this.mapOrderSummary(order));
    }

    return this.prisma.order.findMany({
      where,
      include: orderDetailInclude,
      orderBy,
    });
  }

  private mapOrderSummary(order: OrderSummaryRow) {
    const { _count, returns, ...orderData } = order;

    return {
      ...orderData,
      items: this.createCountPlaceholders(_count.items),
      returns: returns.map((orderReturn) => {
        const { _count: returnCount, ...returnData } = orderReturn;

        return {
          ...returnData,
          items: this.createCountPlaceholders(returnCount.items),
        };
      }),
    };
  }

  private createCountPlaceholders(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      id: String(index),
    }));
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async addItem(orderId: string, dto: AddOrderItemDto, actorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be modified');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { inventory: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    if ((product.inventory?.quantity ?? 0) <= 0) {
      throw new BadRequestException(
        `Sản phẩm ${product.name} đã hết hàng, không thể thêm vào hóa đơn`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existingItem = await tx.orderItem.findFirst({
        where: {
          orderId,
          productId: dto.productId,
        },
      });

      if (existingItem) {
        const nextQuantity = existingItem.quantity + dto.quantity;
        const pricing = this.calculateOrderItemPricing(
          product.price,
          nextQuantity,
          product.taxRate,
        );

        await tx.orderItem.update({
          where: { id: existingItem.id },
          data: {
            unit: product.unit,
            quantity: nextQuantity,
            taxCategory: product.taxCategory,
            taxRate: product.taxRate,
            lineSubtotal: pricing.lineSubtotal,
            discountAmount: pricing.discountAmount,
            taxableAmount: pricing.taxableAmount,
            taxAmount: pricing.taxAmount,
            lineTotal: pricing.lineTotal,
          },
        });
      } else {
        const pricing = this.calculateOrderItemPricing(
          product.price,
          dto.quantity,
          product.taxRate,
        );

        await tx.orderItem.create({
          data: {
            orderId,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unit: product.unit,
            unitPrice: product.price,
            quantity: dto.quantity,
            taxCategory: product.taxCategory,
            taxRate: product.taxRate,
            lineSubtotal: pricing.lineSubtotal,
            discountAmount: pricing.discountAmount,
            taxableAmount: pricing.taxableAmount,
            taxAmount: pricing.taxAmount,
            lineTotal: pricing.lineTotal,
          },
        });
      }

      const updatedOrder = await this.refreshTotals(tx, orderId);

      await this.auditLogService.create(
        {
          actorId,
          entityType: 'Order',
          entityId: orderId,
          action: 'order.add_item',
          metadata: {
            productId: product.id,
            sku: product.sku,
            quantity: dto.quantity,
          },
        },
        tx,
      );

      return updatedOrder;
    });
  }

  async updateItem(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
    actorId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be modified');
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({
        where: {
          id: itemId,
          orderId,
        },
      });

      if (!item) {
        throw new NotFoundException('Order item not found');
      }

      const pricing = this.calculateOrderItemPricing(
        new Prisma.Decimal(item.unitPrice),
        dto.quantity,
        new Prisma.Decimal(item.taxRate),
      );

      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          quantity: dto.quantity,
          lineSubtotal: pricing.lineSubtotal,
          discountAmount: pricing.discountAmount,
          taxableAmount: pricing.taxableAmount,
          taxAmount: pricing.taxAmount,
          lineTotal: pricing.lineTotal,
        },
      });

      const updatedOrder = await this.refreshTotals(tx, orderId);

      await this.auditLogService.create(
        {
          actorId,
          entityType: 'Order',
          entityId: orderId,
          action: 'order.update_item',
          metadata: {
            itemId: item.id,
            productId: item.productId,
            quantityBefore: item.quantity,
            quantityAfter: dto.quantity,
          },
        },
        tx,
      );

      return updatedOrder;
    });
  }

  async removeItem(orderId: string, itemId: string, actorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be modified');
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({
        where: {
          id: itemId,
          orderId,
        },
      });

      if (!item) {
        throw new NotFoundException('Order item not found');
      }

      await tx.orderItem.delete({
        where: { id: item.id },
      });

      const updatedOrder = await this.refreshTotals(tx, orderId);

      await this.auditLogService.create(
        {
          actorId,
          entityType: 'Order',
          entityId: orderId,
          action: 'order.remove_item',
          metadata: {
            itemId: item.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        },
        tx,
      );

      return updatedOrder;
    });
  }

  async checkout(orderId: string, dto: CheckoutOrderDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          revenueLogs: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Order is not pending');
      }

      if (!order.items.length) {
        throw new BadRequestException('Order must have at least one item');
      }

      const existingSaleLog = order.revenueLogs.find(
        (item) => item.type === RevenueLogType.SALE,
      );
      if (existingSaleLog) {
        throw new BadRequestException(
          'Revenue has already been recognized for this order',
        );
      }

      const subtotal = this.sumDecimal(
        order.items.map((item) => item.lineSubtotal),
      );
      const discount = new Prisma.Decimal(dto.discount ?? 0);

      if (discount.gt(subtotal)) {
        throw new BadRequestException('Discount cannot exceed subtotal');
      }

      const pricedItems = this.priceItemsForCheckout(order.items, discount);
      const taxableTotal = this.sumDecimal(
        pricedItems.map((item) => item.taxableAmount),
      );
      const tax = this.sumDecimal(pricedItems.map((item) => item.taxAmount));
      const total = taxableTotal.add(tax);

      const paymentMethod = dto.paymentMethod ?? PaymentMethod.CASH;
      const receivedAmount = new Prisma.Decimal(dto.receivedAmount ?? total);

      if (receivedAmount.lt(total)) {
        throw new BadRequestException(
          'Received amount cannot be lower than total',
        );
      }

      if (paymentMethod !== PaymentMethod.CASH && !receivedAmount.eq(total)) {
        throw new BadRequestException(
          'Non-cash payment must match the payable total exactly',
        );
      }

      const changeAmount =
        paymentMethod === PaymentMethod.CASH
          ? receivedAmount.sub(total)
          : new Prisma.Decimal(0);

      const inventories = await tx.inventory.findMany({
        where: {
          productId: {
            in: order.items.map((item) => item.productId),
          },
        },
      });
      const inventoryMap = new Map(
        inventories.map((item) => [item.productId, item]),
      );

      for (const item of order.items) {
        const inventory = inventoryMap.get(item.productId);
        if (!inventory) {
          throw new BadRequestException(
            `Inventory missing for product ${item.productName}`,
          );
        }

        if (inventory.quantity <= 0) {
          throw new BadRequestException(
            `Sản phẩm ${item.productName} đã hết hàng, không thể thanh toán`,
          );
        }

        if (inventory.quantity < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ${item.productName} chỉ còn ${inventory.quantity}, không đủ để thanh toán ${item.quantity}`,
          );
        }
      }

      for (const item of pricedItems) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            discountAmount: item.discountAmount,
            taxableAmount: item.taxableAmount,
            taxAmount: item.taxAmount,
            lineTotal: item.lineTotal,
          },
        });
      }

      const transition = await tx.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.PENDING,
        },
        data: {
          status: OrderStatus.PAID,
          subtotal,
          discount,
          taxableTotal,
          tax,
          total,
          paidAt: new Date(),
          notes: dto.notes ?? order.notes,
        },
      });

      if (transition.count !== 1) {
        throw new BadRequestException('Order status changed during checkout');
      }

      const revenueLog = await tx.revenueLog.create({
        data: {
          orderId,
          type: RevenueLogType.SALE,
          amount: total,
          reason: 'Revenue recognized on checkout',
          createdById: actorId,
        },
      });

      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          orderId,
          type: PaymentTransactionType.COLLECTION,
          method: paymentMethod,
          amount: total,
          receivedAmount,
          changeAmount,
          externalReference: dto.paymentReference,
          note: `Checkout ${order.orderNumber}`,
          processedById: actorId,
        },
      });

      for (const item of pricedItems) {
        const inventory = inventoryMap.get(item.productId)!;
        const updatedInventory = await tx.$queryRaw<
          Array<{ quantityBefore: number; quantityAfter: number }>
        >(Prisma.sql`
          UPDATE "inventories"
          SET
            "quantity" = "quantity" - ${item.quantity},
            "updatedAt" = NOW()
          WHERE "id" = CAST(${inventory.id} AS UUID)
            AND "quantity" >= ${item.quantity}
          RETURNING
            "quantity" + ${item.quantity} AS "quantityBefore",
            "quantity" AS "quantityAfter"
        `);

        if (!updatedInventory[0]) {
          throw new BadRequestException(
            `Tồn kho của ${item.productName} không đủ, vui lòng kiểm tra lại trước khi thanh toán`,
          );
        }

        const quantityBefore = Number(updatedInventory[0].quantityBefore);
        const quantityAfter = Number(updatedInventory[0].quantityAfter);

        await tx.inventoryLog.create({
          data: {
            inventoryId: inventory.id,
            productId: item.productId,
            orderId,
            type: InventoryLogType.SALE,
            delta: -item.quantity,
            quantityBefore,
            quantityAfter,
            note: `Checkout ${order.orderNumber}`,
            createdById: actorId,
          },
        });
      }

      if (dto.createInvoice) {
        await this.invoiceService.createDraftForOrder(
          {
            orderId,
            provider: dto.provider ?? InvoiceProvider.MISA,
            actorId,
          },
          tx,
        );
      }

      await this.auditLogService.create(
        {
          actorId,
          entityType: 'Order',
          entityId: orderId,
          action: 'order.checkout',
          metadata: {
            orderNumber: order.orderNumber,
            subtotal: subtotal.toString(),
            discount: discount.toString(),
            taxableTotal: taxableTotal.toString(),
            tax: tax.toString(),
            total: total.toString(),
            revenueLogId: revenueLog.id,
            paymentTransactionId: paymentTransaction.id,
            paymentMethod,
            createInvoice: dto.createInvoice ?? false,
          },
        },
        tx,
      );

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: orderDetailInclude,
      });
    });
  }

  async cancel(orderId: string, dto: CancelOrderDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          revenueLogs: true,
          invoice: true,
          paymentTransactions: true,
          returns: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Order has already been cancelled');
      }

      let remainingRefundAmount = new Prisma.Decimal(0);
      let totalRefunded = new Prisma.Decimal(0);

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          notes: dto.reason ?? order.notes,
        },
      });

      if (order.status === OrderStatus.PAID) {
        const saleLog = order.revenueLogs.find(
          (item) => item.type === RevenueLogType.SALE,
        );
        const netRecognizedRevenue = this.getNetRecognizedRevenue(
          order.revenueLogs,
        );
        totalRefunded = this.sumDecimal(
          order.paymentTransactions
            .filter((item) => item.type === PaymentTransactionType.REFUND)
            .map((item) => item.amount),
        );
        remainingRefundAmount = Prisma.Decimal.max(
          netRecognizedRevenue,
          new Prisma.Decimal(0),
        );

        if (remainingRefundAmount.gt(0)) {
          await this.revenueLogService.createAdjustment({
            orderId,
            amount: -Number(remainingRefundAmount),
            reason: dto.reason ?? 'Cancelled paid order',
            actorId,
            adjustmentOfId: saleLog?.id,
            transaction: tx,
          });
        }

        const collection = [...order.paymentTransactions]
          .filter((item) => item.type === PaymentTransactionType.COLLECTION)
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          )[0];

        if (remainingRefundAmount.gt(0)) {
          await tx.paymentTransaction.create({
            data: {
              orderId,
              type: PaymentTransactionType.REFUND,
              method: collection?.method ?? PaymentMethod.CASH,
              amount: remainingRefundAmount,
              externalReference: collection?.externalReference,
              note: dto.reason ?? `Refund for ${order.orderNumber}`,
              processedById: actorId,
            },
          });
        }

        const returnedQuantityMap = this.buildReturnedQuantityMap(
          order.returns,
        );
        const restockableItems = order.items
          .map((item) => ({
            ...item,
            remainingQuantity:
              item.quantity - (returnedQuantityMap.get(item.id) ?? 0),
          }))
          .filter((item) => item.remainingQuantity > 0);
        const inventories = await tx.inventory.findMany({
          where: {
            productId: {
              in: restockableItems.map((item) => item.productId),
            },
          },
        });
        const inventoryMap = new Map(
          inventories.map((item) => [item.productId, item]),
        );

        for (const item of restockableItems) {
          const inventory = inventoryMap.get(item.productId);
          if (!inventory) {
            continue;
          }

          const updatedInventory = await tx.$queryRaw<
            Array<{ quantityBefore: number; quantityAfter: number }>
          >(Prisma.sql`
            UPDATE "inventories"
            SET
              "quantity" = "quantity" + ${item.remainingQuantity},
              "updatedAt" = NOW()
            WHERE "id" = CAST(${inventory.id} AS UUID)
            RETURNING
              "quantity" - ${item.remainingQuantity} AS "quantityBefore",
              "quantity" AS "quantityAfter"
          `);

          const quantityBefore = Number(updatedInventory[0].quantityBefore);
          const quantityAfter = Number(updatedInventory[0].quantityAfter);

          await tx.inventoryLog.create({
            data: {
              inventoryId: inventory.id,
              productId: item.productId,
              orderId,
              type: InventoryLogType.CANCELLATION,
              delta: item.remainingQuantity,
              quantityBefore,
              quantityAfter,
              note: `Cancel ${order.orderNumber}`,
              createdById: actorId,
            },
          });
        }

        if (order.invoice?.status === InvoiceStatus.PENDING) {
          await tx.invoice.update({
            where: { orderId },
            data: {
              status: InvoiceStatus.CANCELLED,
              cancelledAt: new Date(),
              providerStatusMessage:
                dto.reason ?? 'Order cancelled before invoice issue',
            },
          });
        }
      }

      await this.auditLogService.create(
        {
          actorId,
          entityType: 'Order',
          entityId: orderId,
          action: 'order.cancel',
          metadata: {
            reason: dto.reason,
            previousStatus: order.status,
            refundedAmount: remainingRefundAmount.toString(),
            refundedBeforeCancel: totalRefunded.toString(),
          },
        },
        tx,
      );

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: orderDetailInclude,
      });
    });
  }

  async returnPaidItems(
    orderId: string,
    dto: ReturnPaidOrderDto,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          revenueLogs: true,
          invoice: true,
          paymentTransactions: true,
          returns: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException(
          'Only paid orders can be partially returned',
        );
      }

      const saleLog = order.revenueLogs.find(
        (item) => item.type === RevenueLogType.SALE,
      );
      if (!saleLog) {
        throw new BadRequestException(
          'Paid order has no recognized revenue to adjust',
        );
      }

      const returnedQuantityMap = this.buildReturnedQuantityMap(order.returns);
      const returnedAmountMap = this.buildReturnedAmountMap(order.returns);
      const requestedItemIds = new Set<string>();
      const pricedItems: ReturnPricedItem[] = [];

      for (const requestedItem of dto.items) {
        if (requestedItemIds.has(requestedItem.orderItemId)) {
          throw new BadRequestException(
            'Duplicate order item in return request',
          );
        }
        requestedItemIds.add(requestedItem.orderItemId);

        const orderItem = order.items.find(
          (item) => item.id === requestedItem.orderItemId,
        );

        if (!orderItem) {
          throw new NotFoundException('Order item not found');
        }

        const returnedQuantity = returnedQuantityMap.get(orderItem.id) ?? 0;
        const remainingQuantity = orderItem.quantity - returnedQuantity;

        if (requestedItem.quantity > remainingQuantity) {
          throw new BadRequestException(
            `Return quantity for ${orderItem.productName} exceeds remaining sold quantity`,
          );
        }

        const previousAmounts = returnedAmountMap.get(orderItem.id) ?? {
          lineSubtotal: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          taxableAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(0),
          lineTotal: new Prisma.Decimal(0),
        };

        pricedItems.push({
          orderItemId: orderItem.id,
          productId: orderItem.productId,
          productName: orderItem.productName,
          sku: orderItem.sku,
          unit: orderItem.unit,
          unitPrice: new Prisma.Decimal(orderItem.unitPrice),
          restockedQuantity:
            requestedItem.restock === false ? 0 : requestedItem.quantity,
          ...this.calculateReturnPricing(
            orderItem,
            requestedItem.quantity,
            returnedQuantity,
            previousAmounts,
          ),
        });
      }

      const subtotal = this.sumDecimal(
        pricedItems.map((item) => item.lineSubtotal),
      );
      const discount = this.sumDecimal(
        pricedItems.map((item) => item.discountAmount),
      );
      const taxableTotal = this.sumDecimal(
        pricedItems.map((item) => item.taxableAmount),
      );
      const tax = this.sumDecimal(pricedItems.map((item) => item.taxAmount));
      const total = this.sumDecimal(pricedItems.map((item) => item.lineTotal));

      if (total.lte(0)) {
        throw new BadRequestException(
          'Return amount must be greater than zero',
        );
      }

      const invoiceResolution = this.resolveReturnInvoiceAction(order.invoice);
      const returnNumber = await this.generateReturnNumber(tx);

      const createdReturn = await tx.orderReturn.create({
        data: {
          orderId,
          returnNumber,
          reason: dto.reason,
          subtotal,
          discount,
          taxableTotal,
          tax,
          total,
          invoiceAction: invoiceResolution.action,
          invoiceNote: invoiceResolution.note,
          createdById: actorId,
          items: {
            create: pricedItems.map((item) => ({
              orderItemId: item.orderItemId,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              unit: item.unit,
              quantity: item.quantity,
              restockedQuantity: item.restockedQuantity,
              unitPrice: item.unitPrice,
              lineSubtotal: item.lineSubtotal,
              discountAmount: item.discountAmount,
              taxableAmount: item.taxableAmount,
              taxAmount: item.taxAmount,
              lineTotal: item.lineTotal,
              note:
                item.restockedQuantity === item.quantity
                  ? 'Nhập lại tồn kho bán được'
                  : 'Không nhập lại toàn bộ vào tồn kho bán được',
            })),
          },
        },
      });

      await this.revenueLogService.createAdjustment({
        orderId,
        amount: -Number(total),
        reason: dto.reason ?? `Partial return ${returnNumber}`,
        actorId,
        adjustmentOfId: saleLog.id,
        transaction: tx,
      });

      const collection = [...order.paymentTransactions]
        .filter((item) => item.type === PaymentTransactionType.COLLECTION)
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        )[0];

      await tx.paymentTransaction.create({
        data: {
          orderId,
          type: PaymentTransactionType.REFUND,
          method: dto.refundMethod ?? collection?.method ?? PaymentMethod.CASH,
          amount: total,
          externalReference:
            dto.refundReference ?? collection?.externalReference,
          note: dto.reason ?? `Refund for ${returnNumber}`,
          processedById: actorId,
        },
      });

      const restockItems = pricedItems.filter(
        (item) => item.restockedQuantity > 0,
      );
      if (restockItems.length) {
        const inventories = await tx.inventory.findMany({
          where: {
            productId: {
              in: restockItems.map((item) => item.productId),
            },
          },
        });
        const inventoryMap = new Map(
          inventories.map((item) => [item.productId, item]),
        );

        for (const item of restockItems) {
          const inventory = inventoryMap.get(item.productId);
          if (!inventory) {
            throw new BadRequestException(
              `Inventory missing for product ${item.productName}`,
            );
          }

          const updatedInventory = await tx.$queryRaw<
            Array<{ quantityBefore: number; quantityAfter: number }>
          >(Prisma.sql`
            UPDATE "inventories"
            SET
              "quantity" = "quantity" + ${item.restockedQuantity},
              "updatedAt" = NOW()
            WHERE "id" = CAST(${inventory.id} AS UUID)
            RETURNING
              "quantity" - ${item.restockedQuantity} AS "quantityBefore",
              "quantity" AS "quantityAfter"
          `);

          const quantityBefore = Number(updatedInventory[0].quantityBefore);
          const quantityAfter = Number(updatedInventory[0].quantityAfter);

          await tx.inventoryLog.create({
            data: {
              inventoryId: inventory.id,
              productId: item.productId,
              orderId,
              type: InventoryLogType.RETURN,
              delta: item.restockedQuantity,
              quantityBefore,
              quantityAfter,
              note: `Return ${returnNumber} for ${order.orderNumber}`,
              createdById: actorId,
            },
          });
        }
      }

      if (order.invoice && invoiceResolution.note) {
        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            providerStatusMessage: invoiceResolution.note,
          },
        });
      }

      await this.auditLogService.create(
        {
          actorId,
          entityType: 'OrderReturn',
          entityId: createdReturn.id,
          action: 'order.return_partial',
          metadata: {
            orderId,
            orderNumber: order.orderNumber,
            returnNumber,
            subtotal: subtotal.toString(),
            discount: discount.toString(),
            taxableTotal: taxableTotal.toString(),
            tax: tax.toString(),
            total: total.toString(),
            invoiceAction: invoiceResolution.action,
          },
        },
        tx,
      );

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: orderDetailInclude,
      });
    });
  }

  async createAdjustment(
    orderId: string,
    dto: CreateRevenueAdjustmentDto,
    actorId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { revenueLogs: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.PENDING) {
      throw new BadRequestException(
        'Pending order has no recognized revenue to adjust',
      );
    }

    const saleLog = order.revenueLogs.find(
      (item) => item.type === RevenueLogType.SALE,
    );
    return this.revenueLogService.createAdjustment({
      orderId,
      amount: dto.amount,
      reason: dto.reason,
      actorId,
      adjustmentOfId: saleLog?.id,
    });
  }

  private async refreshTotals(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    const subtotal = this.sumDecimal(
      order.items.map((item) => item.lineSubtotal),
    );
    const discount = this.sumDecimal(
      order.items.map((item) => item.discountAmount),
    );
    const taxableTotal = this.sumDecimal(
      order.items.map((item) => item.taxableAmount),
    );
    const tax = this.sumDecimal(order.items.map((item) => item.taxAmount));
    const total = taxableTotal.add(tax);

    return tx.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        discount,
        taxableTotal,
        tax,
        total,
      },
      include: {
        items: true,
        paymentTransactions: true,
      },
    });
  }

  private calculateOrderItemPricing(
    unitPrice: Prisma.Decimal,
    quantity: number,
    taxRate: Prisma.Decimal,
    discountAmount = new Prisma.Decimal(0),
  ): OrderItemPricing {
    const lineSubtotal = unitPrice.mul(quantity);
    const taxableAmount = lineSubtotal.sub(discountAmount);
    const taxAmount = this.calculateTaxAmount(taxableAmount, taxRate);

    return {
      lineSubtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      lineTotal: taxableAmount.add(taxAmount),
    };
  }

  private priceItemsForCheckout(
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      quantity: number;
      lineSubtotal: Prisma.Decimal;
      taxRate: Prisma.Decimal;
    }>,
    totalDiscount: Prisma.Decimal,
  ): CheckoutPricedItem[] {
    const subtotal = this.sumDecimal(items.map((item) => item.lineSubtotal));
    let remainingDiscount = totalDiscount;

    return items.map((item, index) => {
      const isLast = index === items.length - 1;
      const discountAmount = isLast
        ? remainingDiscount
        : totalDiscount
            .mul(item.lineSubtotal)
            .div(subtotal)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      remainingDiscount = Prisma.Decimal.max(
        remainingDiscount.sub(discountAmount),
        new Prisma.Decimal(0),
      );

      const pricing = this.calculateOrderItemPricing(
        item.lineSubtotal.div(item.quantity),
        item.quantity,
        item.taxRate,
        discountAmount,
      );

      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        ...pricing,
      };
    });
  }

  private calculateTaxAmount(
    taxableAmount: Prisma.Decimal,
    taxRate: Prisma.Decimal,
  ): Prisma.Decimal {
    if (taxRate.eq(0) || taxableAmount.lte(0)) {
      return new Prisma.Decimal(0);
    }

    return taxableAmount
      .mul(taxRate)
      .div(100)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private calculateReturnPricing(
    item: {
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineSubtotal: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      taxableAmount: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    },
    requestedQuantity: number,
    returnedQuantity: number,
    previousAmounts: Omit<ReturnPricingContext, 'quantity'>,
  ): ReturnPricingContext {
    return {
      quantity: requestedQuantity,
      lineSubtotal: this.allocateReturnAmount(
        item.lineSubtotal,
        item.quantity,
        returnedQuantity,
        previousAmounts.lineSubtotal,
        requestedQuantity,
      ),
      discountAmount: this.allocateReturnAmount(
        item.discountAmount,
        item.quantity,
        returnedQuantity,
        previousAmounts.discountAmount,
        requestedQuantity,
      ),
      taxableAmount: this.allocateReturnAmount(
        item.taxableAmount,
        item.quantity,
        returnedQuantity,
        previousAmounts.taxableAmount,
        requestedQuantity,
      ),
      taxAmount: this.allocateReturnAmount(
        item.taxAmount,
        item.quantity,
        returnedQuantity,
        previousAmounts.taxAmount,
        requestedQuantity,
      ),
      lineTotal: this.allocateReturnAmount(
        item.lineTotal,
        item.quantity,
        returnedQuantity,
        previousAmounts.lineTotal,
        requestedQuantity,
      ),
    };
  }

  private allocateReturnAmount(
    originalAmount: Prisma.Decimal,
    originalQuantity: number,
    returnedQuantity: number,
    previouslyReturnedAmount: Prisma.Decimal,
    requestedQuantity: number,
  ) {
    const remainingQuantity = originalQuantity - returnedQuantity;
    if (remainingQuantity <= 0) {
      throw new BadRequestException(
        'Order item has no quantity left to return',
      );
    }

    if (requestedQuantity === remainingQuantity) {
      return Prisma.Decimal.max(
        originalAmount.sub(previouslyReturnedAmount),
        new Prisma.Decimal(0),
      );
    }

    return originalAmount
      .mul(requestedQuantity)
      .div(originalQuantity)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private buildReturnedQuantityMap(
    returns: Array<{
      items: Array<{
        orderItemId: string;
        quantity: number;
      }>;
    }>,
  ) {
    const map = new Map<string, number>();

    for (const orderReturn of returns) {
      for (const item of orderReturn.items) {
        map.set(
          item.orderItemId,
          (map.get(item.orderItemId) ?? 0) + item.quantity,
        );
      }
    }

    return map;
  }

  private buildReturnedAmountMap(
    returns: Array<{
      items: Array<{
        orderItemId: string;
        lineSubtotal: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        taxableAmount: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        lineTotal: Prisma.Decimal;
      }>;
    }>,
  ) {
    const map = new Map<string, Omit<ReturnPricingContext, 'quantity'>>();

    for (const orderReturn of returns) {
      for (const item of orderReturn.items) {
        const current = map.get(item.orderItemId) ?? {
          lineSubtotal: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          taxableAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(0),
          lineTotal: new Prisma.Decimal(0),
        };

        map.set(item.orderItemId, {
          lineSubtotal: current.lineSubtotal.add(item.lineSubtotal),
          discountAmount: current.discountAmount.add(item.discountAmount),
          taxableAmount: current.taxableAmount.add(item.taxableAmount),
          taxAmount: current.taxAmount.add(item.taxAmount),
          lineTotal: current.lineTotal.add(item.lineTotal),
        });
      }
    }

    return map;
  }

  private getNetRecognizedRevenue(
    revenueLogs: Array<{
      amount: Prisma.Decimal;
      type: RevenueLogType;
    }>,
  ) {
    return revenueLogs.reduce((total, log) => {
      if (log.type === RevenueLogType.SALE) {
        return total.add(log.amount);
      }

      return total.add(log.amount);
    }, new Prisma.Decimal(0));
  }

  private resolveReturnInvoiceAction(
    invoice:
      | {
          status: InvoiceStatus;
        }
      | null
      | undefined,
  ) {
    if (!invoice) {
      return {
        action: OrderReturnInvoiceAction.NONE,
        note: null,
      };
    }

    if (invoice.status === InvoiceStatus.PENDING) {
      return {
        action: OrderReturnInvoiceAction.REVIEW_DRAFT,
        note: 'Đơn đã phát sinh trả hàng sau thanh toán. Cần rà soát bản nháp hóa đơn trước khi phát hành.',
      };
    }

    if (invoice.status !== InvoiceStatus.ISSUED) {
      return {
        action: OrderReturnInvoiceAction.NONE,
        note: 'Đơn đã phát sinh trả hàng sau thanh toán. Rà soát lại trạng thái hóa đơn gốc trước khi xử lý tiếp.',
      };
    }

    return {
      action: OrderReturnInvoiceAction.ISSUE_ADJUSTMENT,
      note: 'Đơn đã phát sinh trả hàng sau thanh toán. Cần lập hóa đơn điều chỉnh giảm tham chiếu hóa đơn gốc theo Nghị định 70/2025/NĐ-CP.',
    };
  }

  private sumDecimal(values: Prisma.Decimal[]) {
    return values.reduce((acc, value) => acc.add(value), new Prisma.Decimal(0));
  }

  private async generateReturnNumber(tx: Prisma.TransactionClient) {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await tx.orderReturn.count({
      where: {
        createdAt: {
          gte: new Date(
            `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
          ),
        },
      },
    });

    return `RET-${stamp}-${String(count + 1).padStart(5, '0')}`;
  }

  private async generateOrderNumber() {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(
            `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
          ),
        },
      },
    });

    return `ORD-${stamp}-${String(count + 1).padStart(5, '0')}`;
  }
}
