import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { RevenueLogModule } from '../revenue-log/revenue-log.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [AuditLogModule, RevenueLogModule, InvoiceModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
