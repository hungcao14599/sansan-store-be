import { Prisma, TaxCategory } from '@prisma/client';
export declare function getTaxRateByCategory(category: TaxCategory): Prisma.Decimal;
