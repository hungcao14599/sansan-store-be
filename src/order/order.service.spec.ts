import { BadRequestException } from '@nestjs/common';
import {
  InventoryLogType,
  InvoiceStatus,
  OrderStatus,
  PaymentMethod,
  PaymentTransactionType,
  Prisma,
  RevenueLogType,
} from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { InvoiceService } from '../invoice/invoice.service';
import { RevenueLogService } from '../revenue-log/revenue-log.service';
import { OrderService } from './order.service';

describe('OrderService checkout', () => {
  const orderId = 'order-1';
  const actorId = 'user-1';
  const productId = 'product-1';

  const tx = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    orderItem: {
      update: jest.fn(),
    },
    inventory: {
      findMany: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    revenueLog: {
      create: jest.fn(),
    },
    paymentTransaction: {
      create: jest.fn(),
    },
    orderReturn: {
      count: jest.fn(),
      create: jest.fn(),
    },
    invoice: {
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as never;

  const auditLogService = {
    create: jest.fn(),
  } as unknown as AuditLogService;

  const revenueLogService = {
    createAdjustment: jest.fn(),
  } as unknown as RevenueLogService;

  const invoiceService = {
    createDraftForOrder: jest.fn(),
  } as unknown as InvoiceService;

  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService(
      prisma as never,
      auditLogService,
      revenueLogService,
      invoiceService,
    );
  });

  it('creates revenue log, payment transaction and inventory logs when checkout succeeds', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      orderNumber: 'ORD-20260417-00001',
      status: OrderStatus.PENDING,
      notes: null,
      total: new Prisma.Decimal(24000),
      items: [
        {
          id: 'item-1',
          productId,
          productName: 'Coca Cola 390ml',
          quantity: 2,
          lineSubtotal: new Prisma.Decimal(24000),
          taxRate: new Prisma.Decimal(10),
        },
      ],
      revenueLogs: [],
    });

    tx.inventory.findMany.mockResolvedValue([
      {
        id: 'inventory-1',
        productId,
        quantity: 10,
      },
    ]);

    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.revenueLog.create.mockResolvedValue({
      id: 'rev-1',
      type: RevenueLogType.SALE,
      amount: new Prisma.Decimal(26400),
    });
    tx.paymentTransaction.create.mockResolvedValue({
      id: 'payment-1',
      type: PaymentTransactionType.COLLECTION,
      method: PaymentMethod.CASH,
      amount: new Prisma.Decimal(26400),
    });
    tx.$queryRaw.mockResolvedValue([
      {
        quantityBefore: 10,
        quantityAfter: 8,
      },
    ]);
    tx.order.findUniqueOrThrow.mockResolvedValue({
      id: orderId,
      status: OrderStatus.PAID,
      total: new Prisma.Decimal(26400),
      items: [],
      revenueLogs: [{ id: 'rev-1', amount: new Prisma.Decimal(26400) }],
      invoice: null,
      paymentTransactions: [
        {
          id: 'payment-1',
          amount: new Prisma.Decimal(26400),
        },
      ],
    });

    await service.checkout(orderId, { discount: 0 }, actorId);

    expect(tx.orderItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.objectContaining({
        taxAmount: new Prisma.Decimal(2400),
        lineTotal: new Prisma.Decimal(26400),
      }),
    });
    expect(tx.revenueLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId,
        type: RevenueLogType.SALE,
        amount: new Prisma.Decimal(26400),
      }),
    });
    expect(tx.paymentTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId,
        type: PaymentTransactionType.COLLECTION,
        method: PaymentMethod.CASH,
      }),
    });
    expect(tx.inventoryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: InventoryLogType.SALE,
        orderId,
        delta: -2,
      }),
    });
    expect(auditLogService.create).toHaveBeenCalled();
  });

  it('rejects checkout when stock is insufficient after a concurrent change', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      orderNumber: 'ORD-20260417-00001',
      status: OrderStatus.PENDING,
      notes: null,
      total: new Prisma.Decimal(24000),
      items: [
        {
          id: 'item-1',
          productId,
          productName: 'Coca Cola 390ml',
          quantity: 12,
          lineSubtotal: new Prisma.Decimal(24000),
          taxRate: new Prisma.Decimal(0),
        },
      ],
      revenueLogs: [],
    });

    tx.inventory.findMany.mockResolvedValue([
      {
        id: 'inventory-1',
        productId,
        quantity: 10,
      },
    ]);
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.revenueLog.create.mockResolvedValue({
      id: 'rev-1',
      type: RevenueLogType.SALE,
      amount: new Prisma.Decimal(24000),
    });
    tx.paymentTransaction.create.mockResolvedValue({
      id: 'payment-1',
      type: PaymentTransactionType.COLLECTION,
      amount: new Prisma.Decimal(24000),
      method: PaymentMethod.CASH,
    });
    tx.$queryRaw.mockResolvedValue([]);

    await expect(
      service.checkout(orderId, { discount: 0 }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.inventoryLog.create).not.toHaveBeenCalled();
  });

  it('rejects non-cash overpayment because the payment amount must match total', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      orderNumber: 'ORD-20260417-00001',
      status: OrderStatus.PENDING,
      notes: null,
      total: new Prisma.Decimal(24000),
      items: [
        {
          id: 'item-1',
          productId,
          productName: 'Coca Cola 390ml',
          quantity: 2,
          lineSubtotal: new Prisma.Decimal(24000),
          taxRate: new Prisma.Decimal(0),
        },
      ],
      revenueLogs: [],
    });

    tx.inventory.findMany.mockResolvedValue([
      {
        id: 'inventory-1',
        productId,
        quantity: 10,
      },
    ]);

    await expect(
      service.checkout(
        orderId,
        {
          discount: 0,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          receivedAmount: 25000,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.revenueLog.create).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('creates a partial return with refund, revenue adjustment, stock return and invoice note', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      orderNumber: 'ORD-20260421-00001',
      status: OrderStatus.PAID,
      items: [
        {
          id: 'item-1',
          productId,
          productName: 'Coca Cola 390ml',
          sku: 'COCA390',
          unit: 'lon',
          unitPrice: new Prisma.Decimal(10000),
          quantity: 5,
          lineSubtotal: new Prisma.Decimal(50000),
          discountAmount: new Prisma.Decimal(0),
          taxableAmount: new Prisma.Decimal(50000),
          taxAmount: new Prisma.Decimal(5000),
          lineTotal: new Prisma.Decimal(55000),
        },
      ],
      revenueLogs: [
        {
          id: 'rev-sale-1',
          type: RevenueLogType.SALE,
          amount: new Prisma.Decimal(55000),
        },
      ],
      invoice: {
        id: 'invoice-1',
        status: InvoiceStatus.ISSUED,
      },
      paymentTransactions: [
        {
          id: 'payment-1',
          type: PaymentTransactionType.COLLECTION,
          method: PaymentMethod.CASH,
          amount: new Prisma.Decimal(55000),
          externalReference: null,
          createdAt: new Date('2026-04-21T06:00:00.000Z'),
        },
      ],
      returns: [],
    });
    tx.orderReturn.count.mockResolvedValue(0);
    tx.orderReturn.create.mockResolvedValue({ id: 'return-1' });
    tx.inventory.findMany.mockResolvedValue([
      {
        id: 'inventory-1',
        productId,
        quantity: 8,
      },
    ]);
    tx.$queryRaw.mockResolvedValue([
      {
        quantityBefore: 8,
        quantityAfter: 10,
      },
    ]);
    tx.order.findUniqueOrThrow.mockResolvedValue({
      id: orderId,
      returns: [],
    });

    await service.returnPaidItems(
      orderId,
      {
        items: [
          {
            orderItemId: 'item-1',
            quantity: 2,
            restock: true,
          },
        ],
        reason: 'Khách đổi ý',
      },
      actorId,
    );

    expect(revenueLogService.createAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        amount: -22000,
        reason: 'Khách đổi ý',
        adjustmentOfId: 'rev-sale-1',
      }),
    );
    expect(tx.paymentTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId,
        type: PaymentTransactionType.REFUND,
        amount: new Prisma.Decimal(22000),
      }),
    });
    expect(tx.inventoryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: InventoryLogType.RETURN,
        delta: 2,
      }),
    });
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: expect.objectContaining({
        providerStatusMessage: expect.stringContaining('điều chỉnh giảm'),
      }),
    });
  });

  it('refunds and restocks only the remaining balance when cancelling after a partial return', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      orderNumber: 'ORD-20260421-00002',
      status: OrderStatus.PAID,
      notes: null,
      items: [
        {
          id: 'item-1',
          productId,
          quantity: 5,
        },
      ],
      revenueLogs: [
        {
          id: 'rev-sale-1',
          type: RevenueLogType.SALE,
          amount: new Prisma.Decimal(55000),
        },
        {
          id: 'rev-adjust-1',
          type: RevenueLogType.ADJUSTMENT,
          amount: new Prisma.Decimal(-22000),
        },
      ],
      invoice: null,
      paymentTransactions: [
        {
          id: 'payment-1',
          type: PaymentTransactionType.COLLECTION,
          method: PaymentMethod.CASH,
          amount: new Prisma.Decimal(55000),
          externalReference: null,
          createdAt: new Date('2026-04-21T06:00:00.000Z'),
        },
        {
          id: 'refund-1',
          type: PaymentTransactionType.REFUND,
          method: PaymentMethod.CASH,
          amount: new Prisma.Decimal(22000),
          externalReference: null,
          createdAt: new Date('2026-04-21T07:00:00.000Z'),
        },
      ],
      returns: [
        {
          items: [
            {
              orderItemId: 'item-1',
              quantity: 2,
            },
          ],
        },
      ],
    });
    tx.order.update.mockResolvedValue({ id: orderId });
    tx.inventory.findMany.mockResolvedValue([
      {
        id: 'inventory-1',
        productId,
        quantity: 4,
      },
    ]);
    tx.$queryRaw.mockResolvedValue([
      {
        quantityBefore: 4,
        quantityAfter: 7,
      },
    ]);
    tx.order.findUniqueOrThrow.mockResolvedValue({
      id: orderId,
      status: OrderStatus.CANCELLED,
    });

    await service.cancel(orderId, { reason: 'Hủy phần còn lại' }, actorId);

    expect(revenueLogService.createAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        amount: -33000,
      }),
    );
    expect(tx.paymentTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId,
        type: PaymentTransactionType.REFUND,
        amount: new Prisma.Decimal(33000),
      }),
    });
    expect(tx.inventoryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: InventoryLogType.CANCELLATION,
        delta: 3,
      }),
    });
  });
});
