import { PaymentMethod } from '@prisma/client';
declare class ReturnPaidOrderItemDto {
    orderItemId: string;
    quantity: number;
    restock?: boolean;
}
export declare class ReturnPaidOrderDto {
    items: ReturnPaidOrderItemDto[];
    reason?: string;
    refundMethod?: PaymentMethod;
    refundReference?: string;
}
export {};
