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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
let InventoryService = class InventoryService {
    prisma;
    auditLogService;
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    async findAll() {
        return this.prisma.inventory.findMany({
            include: {
                product: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }
    async adjust(productId, dto, actorId) {
        const inventory = await this.prisma.inventory.findUnique({
            where: { productId },
            include: { product: true },
        });
        if (!inventory) {
            throw new common_1.NotFoundException('Inventory not found');
        }
        const nextQuantity = inventory.quantity + dto.delta;
        if (nextQuantity < 0) {
            throw new common_1.BadRequestException('Inventory cannot be negative');
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    quantity: nextQuantity,
                    minStock: dto.minStock ?? inventory.minStock,
                },
                include: {
                    product: true,
                },
            });
            await tx.inventoryLog.create({
                data: {
                    inventoryId: inventory.id,
                    productId: inventory.productId,
                    type: dto.type === 'RESTOCK'
                        ? client_1.InventoryLogType.RESTOCK
                        : client_1.InventoryLogType.ADJUSTMENT,
                    delta: dto.delta,
                    quantityBefore: inventory.quantity,
                    quantityAfter: nextQuantity,
                    note: dto.note,
                    createdById: actorId,
                },
            });
            await this.auditLogService.create({
                actorId,
                entityType: 'Inventory',
                entityId: inventory.id,
                action: 'inventory.adjust',
                metadata: {
                    productId,
                    type: dto.type,
                    delta: dto.delta,
                    before: inventory.quantity,
                    after: nextQuantity,
                },
            }, tx);
            return updated;
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map