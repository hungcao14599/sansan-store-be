import { InvoiceProvider } from '@prisma/client';
export type CreateInvoicePayload = {
    orderId: string;
    orderNumber: string;
    subtotal: string;
    discount: string;
    taxableTotal: string;
    tax: string;
    total: string;
    seller: {
        legalName: string;
        storeName: string;
        taxCode: string;
        address: string;
        phone?: string | null;
        email?: string | null;
        invoiceSeries?: string | null;
        invoiceTemplateCode?: string | null;
    };
    payment: {
        method: string;
        externalReference?: string | null;
    };
    items: Array<{
        productId: string;
        sku: string;
        productName: string;
        unit: string;
        quantity: number;
        unitPrice: string;
        lineSubtotal: string;
        discountAmount: string;
        taxableAmount: string;
        taxRate: string;
        taxAmount: string;
        lineTotal: string;
    }>;
    customerName?: string | null;
};
export type InvoiceIntegrationResult = {
    provider: InvoiceProvider;
    status: 'PENDING';
    externalReference: string;
    requestPayload: Record<string, unknown>;
};
export interface InvoiceProviderAdapter {
    createDraftInvoice(payload: CreateInvoicePayload): Promise<InvoiceIntegrationResult>;
}
