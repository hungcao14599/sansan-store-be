import { Prisma, RevenueLogType } from '@prisma/client';
import * as XLSX from 'xlsx';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const prisma = {
    revenueLog: {
      groupBy: jest.fn(),
    },
    order: {
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as never;

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(prisma);
  });

  it('returns revenue report grouped with sales and adjustments', async () => {
    prisma.revenueLog.groupBy.mockResolvedValue([
      {
        type: RevenueLogType.SALE,
        _sum: { amount: new Prisma.Decimal(120000) },
        _count: 3,
      },
      {
        type: RevenueLogType.ADJUSTMENT,
        _sum: { amount: new Prisma.Decimal(-5000) },
        _count: 1,
      },
    ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          period: new Date('2026-04-01T00:00:00.000Z'),
          total: new Prisma.Decimal(80000),
          salesRevenue: new Prisma.Decimal(80000),
          adjustmentRevenue: new Prisma.Decimal(0),
          entries: 2,
        },
        {
          period: new Date('2026-04-02T00:00:00.000Z'),
          total: new Prisma.Decimal(35000),
          salesRevenue: new Prisma.Decimal(40000),
          adjustmentRevenue: new Prisma.Decimal(-5000),
          entries: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          productId: 'product-1',
          sku: 'SN-COCA-390',
          productName: 'Coca Cola 390ml',
          unit: 'lon',
          quantitySold: 6,
          ordersCount: 3,
          subtotal: new Prisma.Decimal(72000),
          discountAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(7200),
          totalRevenue: new Prisma.Decimal(79200),
        },
        {
          productId: 'product-2',
          sku: 'SN-MILO-180',
          productName: 'Sua Milo 180ml',
          unit: 'hop',
          quantitySold: 4,
          ordersCount: 2,
          subtotal: new Prisma.Decimal(40000),
          discountAmount: new Prisma.Decimal(5000),
          taxAmount: new Prisma.Decimal(3300),
          totalRevenue: new Prisma.Decimal(38300),
        },
      ]);
    prisma.order.aggregate.mockResolvedValue({
      _sum: {
        subtotal: new Prisma.Decimal(110000),
        discount: new Prisma.Decimal(5000),
        taxableTotal: new Prisma.Decimal(105000),
        tax: new Prisma.Decimal(10500),
        total: new Prisma.Decimal(115500),
      },
    });

    const result = await service.getRevenueReport({
      groupBy: 'day',
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-02T23:59:59.999Z',
    });

    expect(result.groupBy).toBe('day');
    expect(result.summary.totalRevenue.toString()).toBe('115000');
    expect(result.summary.salesRevenue.toString()).toBe('120000');
    expect(result.summary.adjustmentRevenue.toString()).toBe('-5000');
    expect(result.summary.totalEntries).toBe(4);
    expect(result.summary.totalProductsSold).toBe(2);
    expect(result.summary.totalUnitsSold).toBe(10);
    expect(result.items).toEqual([
      expect.objectContaining({
        entries: 2,
        salesRevenue: expect.any(Prisma.Decimal),
        adjustmentRevenue: expect.any(Prisma.Decimal),
      }),
      expect.objectContaining({
        entries: 2,
        total: expect.any(Prisma.Decimal),
      }),
    ]);
    expect(result.products[0]).toEqual(
      expect.objectContaining({
        sku: 'SN-COCA-390',
        quantitySold: 6,
        totalRevenue: expect.any(Prisma.Decimal),
      }),
    );
  });

  it('exports a workbook with summary and detail sheets', async () => {
    prisma.revenueLog.groupBy.mockResolvedValue([
      {
        type: RevenueLogType.SALE,
        _sum: { amount: new Prisma.Decimal(200000) },
        _count: 2,
      },
    ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          period: new Date('2026-01-01T00:00:00.000Z'),
          total: new Prisma.Decimal(200000),
          salesRevenue: new Prisma.Decimal(200000),
          adjustmentRevenue: new Prisma.Decimal(0),
          entries: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          productId: 'product-1',
          sku: 'SN-MI-TOM',
          productName: 'Mi tom Hao Hao',
          unit: 'goi',
          quantitySold: 20,
          ordersCount: 5,
          subtotal: new Prisma.Decimal(90000),
          discountAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(0),
          totalRevenue: new Prisma.Decimal(90000),
        },
      ]);
    prisma.order.aggregate.mockResolvedValue({
      _sum: {
        subtotal: new Prisma.Decimal(180000),
        discount: new Prisma.Decimal(0),
        taxableTotal: new Prisma.Decimal(180000),
        tax: new Prisma.Decimal(20000),
        total: new Prisma.Decimal(200000),
      },
    });

    const result = await service.exportRevenueReport({
      groupBy: 'month',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z',
    });

    expect(result.filename).toMatch(
      /^bao-cao-doanh-thu-theo-thang-\d{8}\.xlsx$/,
    );

    const workbook = XLSX.read(result.buffer, { type: 'buffer' });
    expect(workbook.SheetNames).toEqual([
      'Tổng quan',
      'Chi tiết',
      'Sản phẩm bán ra',
    ]);

    const summarySheet = XLSX.utils.sheet_to_json<(string | number)[]>(
      workbook.Sheets['Tổng quan'],
      { header: 1 },
    );
    const detailSheet = XLSX.utils.sheet_to_json<
      Record<string, string | number>
    >(workbook.Sheets['Chi tiết']);
    const productSheet = XLSX.utils.sheet_to_json<
      Record<string, string | number>
    >(workbook.Sheets['Sản phẩm bán ra']);

    expect(summarySheet).toContainEqual(['Kiểu thống kê', 'Theo tháng']);
    expect(summarySheet).toContainEqual(['Số mặt hàng đã bán', 1]);
    expect(summarySheet).toContainEqual(['Tổng số lượng bán', 20]);
    expect(detailSheet[0]).toMatchObject({
      'Số bút toán': 2,
      'Doanh thu bán hàng': 200000,
      'Điều chỉnh doanh thu': 0,
      'Doanh thu thuần': 200000,
    });
    expect(productSheet[0]).toMatchObject({
      SKU: 'SN-MI-TOM',
      'Tên sản phẩm': 'Mi tom Hao Hao',
      'Số lượng bán': 20,
      'Doanh thu thuần': 90000,
    });
  });
});
