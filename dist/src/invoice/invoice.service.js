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
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
class StubInvoiceAdapter {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async createDraftInvoice(payload) {
        return {
            provider: this.provider,
            status: 'PENDING',
            externalReference: `${this.provider}-${payload.orderNumber}-${Date.now()}`,
            requestPayload: payload,
        };
    }
}
let InvoiceService = class InvoiceService {
    prisma;
    auditLogService;
    adapters = new Map([
        [client_1.InvoiceProvider.MISA, new StubInvoiceAdapter(client_1.InvoiceProvider.MISA)],
        [client_1.InvoiceProvider.VNPT, new StubInvoiceAdapter(client_1.InvoiceProvider.VNPT)],
        [client_1.InvoiceProvider.VIETTEL, new StubInvoiceAdapter(client_1.InvoiceProvider.VIETTEL)],
    ]);
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    async createDraftForOrder(params, transaction) {
        const client = transaction ?? this.prisma;
        const [order, businessProfile] = await Promise.all([
            client.order.findUnique({
                where: { id: params.orderId },
                include: {
                    items: true,
                    paymentTransactions: {
                        where: {
                            type: client_1.PaymentTransactionType.COLLECTION,
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
            throw new common_1.NotFoundException('Order not found');
        }
        const adapter = this.adapters.get(params.provider);
        if (!adapter) {
            throw new common_1.NotFoundException('Invoice provider is not supported');
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
        const payload = {
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
                status: client_1.InvoiceStatus.PENDING,
                externalReference: result.externalReference,
                invoiceSeries: seller.invoiceSeries,
                invoiceTemplateCode: seller.invoiceTemplateCode,
                sellerName: seller.legalName,
                sellerTaxCode: seller.taxCode,
                issuedById: params.actorId,
                providerStatusMessage: 'Draft invoice prepared for provider handoff',
                requestPayload: result.requestPayload,
            },
            create: {
                orderId: order.id,
                businessProfileId: businessProfile?.id,
                provider: params.provider,
                status: client_1.InvoiceStatus.PENDING,
                externalReference: result.externalReference,
                invoiceSeries: seller.invoiceSeries,
                invoiceTemplateCode: seller.invoiceTemplateCode,
                sellerName: seller.legalName,
                sellerTaxCode: seller.taxCode,
                buyerName: order.customerName,
                issuedById: params.actorId,
                providerStatusMessage: 'Draft invoice prepared for provider handoff',
                requestPayload: result.requestPayload,
            },
        });
        await this.auditLogService.create({
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
        }, client);
        return invoice;
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map