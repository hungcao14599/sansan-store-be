import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../common/prisma/prisma.service';
export declare class RevenueLogService {
    private readonly prisma;
    private readonly auditLogService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    findByOrderId(orderId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orderId: string;
        type: import("@prisma/client").$Enums.RevenueLogType;
        createdById: string | null;
        amount: Prisma.Decimal;
        reason: string | null;
        adjustmentOfId: string | null;
    }[]>;
    createAdjustment(params: {
        orderId: string;
        amount: number;
        reason: string;
        actorId: string;
        adjustmentOfId?: string;
        transaction?: Prisma.TransactionClient;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        orderId: string;
        type: import("@prisma/client").$Enums.RevenueLogType;
        createdById: string | null;
        amount: Prisma.Decimal;
        reason: string | null;
        adjustmentOfId: string | null;
    }>;
}
