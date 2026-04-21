"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaxRateByCategory = getTaxRateByCategory;
const client_1 = require("@prisma/client");
const TAX_RATE_BY_CATEGORY = {
    NO_VAT: '0',
    VAT_0: '0',
    VAT_5: '5',
    VAT_8: '8',
    VAT_10: '10',
};
function getTaxRateByCategory(category) {
    return new client_1.Prisma.Decimal(TAX_RATE_BY_CATEGORY[category]);
}
//# sourceMappingURL=tax.utils.js.map