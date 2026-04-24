import { TaxCategory } from '@prisma/client';
export declare class CreateProductDto {
    sku: string;
    name: string;
    productGroupId?: string;
    productGroupName?: string;
    barcode?: string;
    description?: string;
    unit?: string;
    price: number;
    costPrice?: number;
    discountAmount?: number;
    discountPercent?: number;
    taxCategory?: TaxCategory;
    initialStock?: number;
    minStock?: number;
}
