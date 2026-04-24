"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    const adminPassword = await (0, bcryptjs_1.hash)('Admin@123', 10);
    const staffPassword = await (0, bcryptjs_1.hash)('Staff@123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@sansan.local' },
        update: {
            fullName: 'System Admin',
            passwordHash: adminPassword,
            role: client_1.UserRole.ADMIN,
            isActive: true,
        },
        create: {
            email: 'admin@sansan.local',
            fullName: 'System Admin',
            passwordHash: adminPassword,
            role: client_1.UserRole.ADMIN,
        },
    });
    await prisma.user.upsert({
        where: { email: 'staff@sansan.local' },
        update: {
            fullName: 'Store Staff',
            passwordHash: staffPassword,
            role: client_1.UserRole.STAFF,
            isActive: true,
        },
        create: {
            email: 'staff@sansan.local',
            fullName: 'Store Staff',
            passwordHash: staffPassword,
            role: client_1.UserRole.STAFF,
        },
    });
    const businessProfile = await prisma.businessProfile.upsert({
        where: { taxCode: '0312345678' },
        update: {
            legalName: 'Ho Kinh Doanh Sansan Store',
            storeName: 'Sansan Grocery',
            address: '123 Nguyen Hue, Quan 1, TP.HCM',
            phone: '0901234567',
            email: 'ops@sansan.local',
            invoiceSeries: 'C26TSA',
            invoiceTemplateCode: '1/001',
            defaultInvoiceProvider: 'MISA',
        },
        create: {
            legalName: 'Ho Kinh Doanh Sansan Store',
            storeName: 'Sansan Grocery',
            taxCode: '0312345678',
            ownerName: 'Sansan Owner',
            address: '123 Nguyen Hue, Quan 1, TP.HCM',
            phone: '0901234567',
            email: 'ops@sansan.local',
            invoiceSeries: 'C26TSA',
            invoiceTemplateCode: '1/001',
            defaultInvoiceProvider: 'MISA',
        },
    });
    const samples = [
        {
            sku: 'SN-COCA-390',
            name: 'Coca Cola 390ml',
            productGroup: 'Do uong',
            unit: 'lon',
            price: '12000',
            costPrice: '9000',
            quantity: 48,
            minStock: 12,
            taxCategory: client_1.TaxCategory.VAT_10,
        },
        {
            sku: 'SN-MILO-180',
            name: 'Sua Milo 180ml',
            productGroup: 'Do uong',
            unit: 'hop',
            price: '10000',
            costPrice: '7500',
            quantity: 36,
            minStock: 10,
            taxCategory: client_1.TaxCategory.VAT_10,
        },
        {
            sku: 'SN-MI-TOM',
            name: 'Mi tom Hao Hao',
            productGroup: 'Thuc pham kho',
            unit: 'goi',
            price: '4500',
            costPrice: '3200',
            quantity: 120,
            minStock: 24,
            taxCategory: client_1.TaxCategory.NO_VAT,
        },
        {
            sku: 'SN-DUONG-1KG',
            name: 'Duong cat 1kg',
            productGroup: 'Gia vi',
            unit: 'goi',
            price: '28000',
            costPrice: '24000',
            quantity: 20,
            minStock: 5,
            taxCategory: client_1.TaxCategory.NO_VAT,
        },
    ];
    for (const item of samples) {
        const productGroup = await prisma.productGroup.upsert({
            where: { name: item.productGroup },
            update: {
                isActive: true,
            },
            create: {
                name: item.productGroup,
            },
        });
        const product = await prisma.product.upsert({
            where: { sku: item.sku },
            update: {
                name: item.name,
                productGroupId: productGroup.id,
                unit: item.unit,
                price: item.price,
                costPrice: item.costPrice,
                taxCategory: item.taxCategory,
                taxRate: item.taxCategory === client_1.TaxCategory.NO_VAT ? '0' : '10',
                isActive: true,
            },
            create: {
                sku: item.sku,
                name: item.name,
                productGroupId: productGroup.id,
                unit: item.unit,
                price: item.price,
                costPrice: item.costPrice,
                taxCategory: item.taxCategory,
                taxRate: item.taxCategory === client_1.TaxCategory.NO_VAT ? '0' : '10',
            },
        });
        const inventory = await prisma.inventory.upsert({
            where: { productId: product.id },
            update: {
                quantity: item.quantity,
                minStock: item.minStock,
            },
            create: {
                productId: product.id,
                quantity: item.quantity,
                minStock: item.minStock,
            },
        });
        const initialLogExists = await prisma.inventoryLog.findFirst({
            where: {
                inventoryId: inventory.id,
                type: 'INITIAL',
            },
        });
        if (!initialLogExists) {
            await prisma.inventoryLog.create({
                data: {
                    inventoryId: inventory.id,
                    productId: product.id,
                    type: 'INITIAL',
                    delta: item.quantity,
                    quantityBefore: 0,
                    quantityAfter: item.quantity,
                    note: 'Seed initial stock',
                    createdById: admin.id,
                },
            });
        }
    }
    const demoOrder = await prisma.order.findFirst({
        where: { orderNumber: 'ORD-DEMO-PAID' },
        include: {
            items: true,
            revenueLogs: true,
            paymentTransactions: true,
            invoice: true,
        },
    });
    if (!demoOrder) {
        const product = await prisma.product.findUniqueOrThrow({
            where: { sku: 'SN-MI-TOM' },
        });
        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: { productId: product.id },
        });
        const lineSubtotal = '9000';
        const lineTotal = '9000';
        const order = await prisma.order.create({
            data: {
                orderNumber: 'ORD-DEMO-PAID',
                status: 'PAID',
                subtotal: lineSubtotal,
                taxableTotal: lineSubtotal,
                total: lineTotal,
                paidAt: new Date(),
                createdById: admin.id,
                items: {
                    create: {
                        productId: product.id,
                        productName: product.name,
                        sku: product.sku,
                        unit: product.unit,
                        unitPrice: product.price,
                        quantity: 2,
                        taxCategory: product.taxCategory,
                        taxRate: product.taxRate,
                        lineSubtotal,
                        discountAmount: '0',
                        taxableAmount: lineSubtotal,
                        taxAmount: '0',
                        lineTotal,
                    },
                },
            },
            include: {
                items: true,
            },
        });
        await prisma.revenueLog.create({
            data: {
                orderId: order.id,
                type: client_1.RevenueLogType.SALE,
                amount: order.total,
                reason: 'Seed paid order',
                createdById: admin.id,
            },
        });
        await prisma.paymentTransaction.create({
            data: {
                orderId: order.id,
                type: client_1.PaymentTransactionType.COLLECTION,
                method: client_1.PaymentMethod.CASH,
                amount: order.total,
                receivedAmount: order.total,
                changeAmount: '0',
                note: 'Seed paid order collection',
                processedById: admin.id,
            },
        });
        await prisma.inventory.update({
            where: { id: inventory.id },
            data: {
                quantity: inventory.quantity - 2,
            },
        });
        await prisma.inventoryLog.create({
            data: {
                inventoryId: inventory.id,
                productId: product.id,
                orderId: order.id,
                type: client_1.InventoryLogType.SALE,
                delta: -2,
                quantityBefore: inventory.quantity,
                quantityAfter: inventory.quantity - 2,
                note: 'Seed paid order stock deduction',
                createdById: admin.id,
            },
        });
        await prisma.invoice.upsert({
            where: { orderId: order.id },
            update: {
                businessProfileId: businessProfile.id,
                provider: 'MISA',
                status: 'PENDING',
                externalReference: `MISA-${order.orderNumber}-SEED`,
                invoiceSeries: businessProfile.invoiceSeries,
                invoiceTemplateCode: businessProfile.invoiceTemplateCode,
                sellerName: businessProfile.legalName,
                sellerTaxCode: businessProfile.taxCode,
                issuedById: admin.id,
                providerStatusMessage: 'Seed draft invoice',
            },
            create: {
                orderId: order.id,
                businessProfileId: businessProfile.id,
                provider: 'MISA',
                status: 'PENDING',
                externalReference: `MISA-${order.orderNumber}-SEED`,
                invoiceSeries: businessProfile.invoiceSeries,
                invoiceTemplateCode: businessProfile.invoiceTemplateCode,
                sellerName: businessProfile.legalName,
                sellerTaxCode: businessProfile.taxCode,
                issuedById: admin.id,
                providerStatusMessage: 'Seed draft invoice',
            },
        });
    }
    else {
        const hasRevenueLog = demoOrder.revenueLogs.some((item) => item.type === client_1.RevenueLogType.SALE);
        if (!hasRevenueLog) {
            await prisma.revenueLog.create({
                data: {
                    orderId: demoOrder.id,
                    type: client_1.RevenueLogType.SALE,
                    amount: demoOrder.total,
                    reason: 'Seed paid order',
                    createdById: admin.id,
                },
            });
        }
        const hasCollection = demoOrder.paymentTransactions.some((item) => item.type === client_1.PaymentTransactionType.COLLECTION);
        if (!hasCollection) {
            await prisma.paymentTransaction.create({
                data: {
                    orderId: demoOrder.id,
                    type: client_1.PaymentTransactionType.COLLECTION,
                    method: client_1.PaymentMethod.CASH,
                    amount: demoOrder.total,
                    receivedAmount: demoOrder.total,
                    changeAmount: '0',
                    note: 'Seed paid order collection',
                    processedById: admin.id,
                },
            });
        }
        const hasInventoryLogs = await prisma.inventoryLog.findFirst({
            where: { orderId: demoOrder.id },
        });
        if (!hasInventoryLogs) {
            for (const item of demoOrder.items) {
                const inventory = await prisma.inventory.findUniqueOrThrow({
                    where: { productId: item.productId },
                });
                await prisma.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        quantity: inventory.quantity - item.quantity,
                    },
                });
                await prisma.inventoryLog.create({
                    data: {
                        inventoryId: inventory.id,
                        productId: item.productId,
                        orderId: demoOrder.id,
                        type: client_1.InventoryLogType.SALE,
                        delta: -item.quantity,
                        quantityBefore: inventory.quantity,
                        quantityAfter: inventory.quantity - item.quantity,
                        note: 'Seed paid order stock deduction',
                        createdById: admin.id,
                    },
                });
            }
        }
        if (!demoOrder.invoice) {
            await prisma.invoice.create({
                data: {
                    orderId: demoOrder.id,
                    businessProfileId: businessProfile.id,
                    provider: 'MISA',
                    status: 'PENDING',
                    externalReference: `MISA-${demoOrder.orderNumber}-SEED`,
                    invoiceSeries: businessProfile.invoiceSeries,
                    invoiceTemplateCode: businessProfile.invoiceTemplateCode,
                    sellerName: businessProfile.legalName,
                    sellerTaxCode: businessProfile.taxCode,
                    issuedById: admin.id,
                    providerStatusMessage: 'Seed draft invoice',
                },
            });
        }
    }
}
main()
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map