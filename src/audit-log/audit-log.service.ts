import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: AuditInput,
    transaction?: PrismaLike,
  ): Promise<void> {
    const client = transaction ?? this.prisma;

    await client.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        metadata: input.metadata,
      },
    });
  }
}
