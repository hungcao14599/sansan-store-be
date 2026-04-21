import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { InventoryModule } from './inventory/inventory.module';
import { InvoiceModule } from './invoice/invoice.module';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { ReportsModule } from './reports/reports.module';
import { RevenueLogModule } from './revenue-log/revenue-log.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    UsersModule,
    ProductModule,
    InventoryModule,
    RevenueLogModule,
    InvoiceModule,
    OrderModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
