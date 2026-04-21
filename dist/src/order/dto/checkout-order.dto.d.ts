import { InvoiceProvider, PaymentMethod } from '@prisma/client';
export declare class CheckoutOrderDto {
    discount?: number;
    createInvoice?: boolean;
    provider?: InvoiceProvider;
    paymentMethod?: PaymentMethod;
    receivedAmount?: number;
    paymentReference?: string;
    notes?: string;
}
