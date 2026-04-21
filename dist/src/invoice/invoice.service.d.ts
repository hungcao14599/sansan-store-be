import { InvoiceProvider, Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
export declare class InvoiceService {
    private readonly prisma;
    private readonly auditLogService;
    private readonly adapters;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    createDraftForOrder(params: {
        orderId: string;
        provider: InvoiceProvider;
        actorId: string;
    }, transaction?: Prisma.TransactionClient): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        invoiceSeries: string | null;
        invoiceTemplateCode: string | null;
        orderId: string;
        status: import("@prisma/client").$Enums.InvoiceStatus;
        cancelledAt: Date | null;
        externalReference: string | null;
        businessProfileId: string | null;
        provider: import("@prisma/client").$Enums.InvoiceProvider;
        invoiceNumber: string | null;
        taxAuthorityCode: string | null;
        providerStatusMessage: string | null;
        signedXmlUrl: string | null;
        pdfUrl: string | null;
        buyerName: string | null;
        buyerTaxCode: string | null;
        sellerName: string | null;
        sellerTaxCode: string | null;
        issuedById: string | null;
        adjustmentForInvoiceId: string | null;
        replacementForInvoiceId: string | null;
        requestPayload: Prisma.JsonValue | null;
        responsePayload: Prisma.JsonValue | null;
        issuedAt: Date | null;
    }>;
}
