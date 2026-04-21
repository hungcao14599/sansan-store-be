import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [AuditLogModule],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
