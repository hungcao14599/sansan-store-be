"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueLogModule = void 0;
const common_1 = require("@nestjs/common");
const audit_log_module_1 = require("../audit-log/audit-log.module");
const revenue_log_service_1 = require("./revenue-log.service");
let RevenueLogModule = class RevenueLogModule {
};
exports.RevenueLogModule = RevenueLogModule;
exports.RevenueLogModule = RevenueLogModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_log_module_1.AuditLogModule],
        providers: [revenue_log_service_1.RevenueLogService],
        exports: [revenue_log_service_1.RevenueLogService],
    })
], RevenueLogModule);
//# sourceMappingURL=revenue-log.module.js.map