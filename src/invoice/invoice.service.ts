import { Injectable, NotFoundException } from '@nestjs/common';
import {
  InvoiceProvider,
  InvoiceStatus,
  PaymentTransactionType,
  Prisma,
} from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateInvoicePayload,
  InvoiceProviderAdapter,
} from './providers/invoice-provider.interface';

class StubInvoiceAdapter implements InvoiceProviderAdapter {
  constructor(private readonly provider: InvoiceProvider) {}

  async createDraftInvoice(payload: CreateInvoicePayload) {
    return {
      provider: this.provider,
      status: 'PENDING' as const,
      externalReference: `${this.provider}-${payload.orderNumber}-${Date.now()}`,
      requestPayload: payload,
    };
  }
}

@Injectable()
export class InvoiceService {
  private readonly adapters = new Map<InvoiceProvider, InvoiceProviderAdapter>([
    [InvoiceProvider.MISA, new StubInvoiceAdapter(InvoiceProvider.MISA)],
    [InvoiceProvider.VNPT, new StubInvoiceAdapter(InvoiceProvider.VNPT)],
    [InvoiceProvider.VIETTEL, new StubInvoiceAdapter(InvoiceProvider.VIETTEL)],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createDraftForOrder(
    params: {
      orderId: string;
      provider: InvoiceProvider;
      actorId: string;
    },
    transaction?: Prisma.TransactionClient,
  ) {
    const client = transaction ?? this.prisma;

    const [order, businessProfile] = await Promise.all([
      client.order.findUnique({
        where: { id: params.orderId },
        include: {
          items: true,
          paymentTransactions: {
            where: {
              type: PaymentTransactionType.COLLECTION,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      }),
      client.businessProfile.findFirst({
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const adapter = this.adapters.get(params.provider);
    if (!adapter) {
      throw new NotFoundException('Invoice provider is not supported');
    }

    const seller = businessProfile ?? {
      id: null,
      legalName: 'Ho kinh doanh chua cau hinh',
      storeName: 'Sansan Store',
      taxCode: 'PENDING-TAX-CODE',
      address: 'Vietnam',
      phone: null,
      email: null,
      invoiceSeries: null,
      invoiceTemplateCode: null,
      defaultInvoiceProvider: params.provider,
      taxDeclarationMethod: 'ACTUAL_REVENUE',
      registrationNumber: null,
      ownerName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const collection = order.paymentTransactions[0];
    const payload: CreateInvoicePayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      subtotal: order.subtotal.toString(),
      discount: order.discount.toString(),
      taxableTotal: order.taxableTotal.toString(),
      tax: order.tax.toString(),
      total: order.total.toString(),
      customerName: order.customerName,
      seller: {
        legalName: seller.legalName,
        storeName: seller.storeName,
        taxCode: seller.taxCode,
        address: seller.address,
        phone: seller.phone,
        email: seller.email,
        invoiceSeries: seller.invoiceSeries,
        invoiceTemplateCode: seller.invoiceTemplateCode,
      },
      payment: {
        method: collection?.method ?? 'CASH',
        externalReference: collection?.externalReference,
      },
      items: order.items.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        lineSubtotal: item.lineSubtotal.toString(),
        discountAmount: item.discountAmount.toString(),
        taxableAmount: item.taxableAmount.toString(),
        taxRate: item.taxRate.toString(),
        taxAmount: item.taxAmount.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
    };

    const result = await adapter.createDraftInvoice(payload);

    const invoice = await client.invoice.upsert({
      where: { orderId: order.id },
      update: {
        businessProfileId: businessProfile?.id,
        provider: params.provider,
        status: InvoiceStatus.PENDING,
        externalReference: result.externalReference,
        invoiceSeries: seller.invoiceSeries,
        invoiceTemplateCode: seller.invoiceTemplateCode,
        sellerName: seller.legalName,
        sellerTaxCode: seller.taxCode,
        issuedById: params.actorId,
        providerStatusMessage: 'Draft invoice prepared for provider handoff',
        requestPayload: result.requestPayload as Prisma.InputJsonValue,
      },
      create: {
        orderId: order.id,
        businessProfileId: businessProfile?.id,
        provider: params.provider,
        status: InvoiceStatus.PENDING,
        externalReference: result.externalReference,
        invoiceSeries: seller.invoiceSeries,
        invoiceTemplateCode: seller.invoiceTemplateCode,
        sellerName: seller.legalName,
        sellerTaxCode: seller.taxCode,
        buyerName: order.customerName,
        issuedById: params.actorId,
        providerStatusMessage: 'Draft invoice prepared for provider handoff',
        requestPayload: result.requestPayload as Prisma.InputJsonValue,
      },
    });

    await this.auditLogService.create(
      {
        actorId: params.actorId,
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'invoice.create_draft',
        metadata: {
          orderId: order.id,
          provider: params.provider,
          externalReference: result.externalReference,
          businessProfileId: businessProfile?.id ?? null,
        },
      },
      client,
    );

    return invoice;
  }
}
