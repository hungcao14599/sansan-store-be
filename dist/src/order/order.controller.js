"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const role_enum_1 = require("../common/enums/role.enum");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const add_order_item_dto_1 = require("./dto/add-order-item.dto");
const cancel_order_dto_1 = require("./dto/cancel-order.dto");
const checkout_order_dto_1 = require("./dto/checkout-order.dto");
const create_order_dto_1 = require("./dto/create-order.dto");
const create_order_with_item_dto_1 = require("./dto/create-order-with-item.dto");
const create_revenue_adjustment_dto_1 = require("./dto/create-revenue-adjustment.dto");
const return_paid_order_dto_1 = require("./dto/return-paid-order.dto");
const update_order_item_dto_1 = require("./dto/update-order-item.dto");
const order_service_1 = require("./order.service");
const orderListViews = ['detail', 'summary', 'pos'];
let OrderController = class OrderController {
    orderService;
    constructor(orderService) {
        this.orderService = orderService;
    }
    findAll(view, status) {
        return this.orderService.findAll({
            view: this.parseView(view),
            status: this.parseStatus(status),
        });
    }
    findOne(id) {
        return this.orderService.findOne(id);
    }
    create(dto, user) {
        return this.orderService.create(dto, user.sub);
    }
    createWithItem(dto, user) {
        return this.orderService.createWithItem(dto, user.sub);
    }
    addItem(id, dto, user) {
        return this.orderService.addItem(id, dto, user.sub);
    }
    updateItem(id, itemId, dto, user) {
        return this.orderService.updateItem(id, itemId, dto, user.sub);
    }
    removeItem(id, itemId, user) {
        return this.orderService.removeItem(id, itemId, user.sub);
    }
    checkout(id, dto, user) {
        return this.orderService.checkout(id, dto, user.sub);
    }
    cancel(id, dto, user) {
        return this.orderService.cancel(id, dto, user.sub);
    }
    returnPaidItems(id, dto, user) {
        return this.orderService.returnPaidItems(id, dto, user.sub);
    }
    adjustment(id, dto, user) {
        return this.orderService.createAdjustment(id, dto, user.sub);
    }
    parseView(view) {
        if (!view) {
            return undefined;
        }
        if (!orderListViews.includes(view)) {
            throw new common_1.BadRequestException('Invalid order list view');
        }
        return view;
    }
    parseStatus(status) {
        if (!status) {
            return undefined;
        }
        if (!Object.values(client_1.OrderStatus).includes(status)) {
            throw new common_1.BadRequestException('Invalid order status');
        }
        return status;
    }
};
exports.OrderController = OrderController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('view')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('with-item'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_with_item_dto_1.CreateOrderWithItemDto, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "createWithItem", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_order_item_dto_1.AddOrderItemDto, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "addItem", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_order_item_dto_1.UpdateOrderItemDto, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)(':id/items/:itemId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "removeItem", null);
__decorate([
    (0, common_1.Post)(':id/checkout'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, checkout_order_dto_1.CheckoutOrderDto, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "checkout", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cancel_order_dto_1.CancelOrderDto, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/returns'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, return_paid_order_dto_1.ReturnPaidOrderDto, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "returnPaidItems", null);
__decorate([
    (0, common_1.Post)(':id/adjustment'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_revenue_adjustment_dto_1.CreateRevenueAdjustmentDto, Object]),
    __metadata("design:returntype", void 0)
], OrderController.prototype, "adjustment", null);
exports.OrderController = OrderController = __decorate([
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [order_service_1.OrderService])
], OrderController);
//# sourceMappingURL=order.controller.js.map