import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
type PrismaLike = PrismaService | Prisma.TransactionClient | PrismaClient;
type AuditInput = {
    actorId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Prisma.InputJsonValue;
};
export declare class AuditLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: AuditInput, transaction?: PrismaLike): Promise<void>;
}
export {};
