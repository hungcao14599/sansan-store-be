import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RevenueLogService } from './revenue-log.service';

@Module({
  imports: [AuditLogModule],
  providers: [RevenueLogService],
  exports: [RevenueLogService],
})
export class RevenueLogModule {}
