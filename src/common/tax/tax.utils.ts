import { Prisma, TaxCategory } from '@prisma/client';

const TAX_RATE_BY_CATEGORY: Record<TaxCategory, string> = {
  NO_VAT: '0',
  VAT_0: '0',
  VAT_5: '5',
  VAT_8: '8',
  VAT_10: '10',
};

export function getTaxRateByCategory(category: TaxCategory): Prisma.Decimal {
  return new Prisma.Decimal(TAX_RATE_BY_CATEGORY[category]);
}
