"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const audit_log_module_1 = require("./audit-log/audit-log.module");
const auth_module_1 = require("./auth/auth.module");
const prisma_module_1 = require("./common/prisma/prisma.module");
const inventory_module_1 = require("./inventory/inventory.module");
const invoice_module_1 = require("./invoice/invoice.module");
const order_module_1 = require("./order/order.module");
const product_module_1 = require("./product/product.module");
const reports_module_1 = require("./reports/reports.module");
const revenue_log_module_1 = require("./revenue-log/revenue-log.module");
const users_module_1 = require("./users/users.module");
const app_controller_1 = require("./app.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            prisma_module_1.PrismaModule,
            audit_log_module_1.AuditLogModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            product_module_1.ProductModule,
            inventory_module_1.InventoryModule,
            revenue_log_module_1.RevenueLogModule,
            invoice_module_1.InvoiceModule,
            order_module_1.OrderModule,
            reports_module_1.ReportsModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map