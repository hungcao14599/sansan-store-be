import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderWithItemDto } from './dto/create-order-with-item.dto';
import { CreateRevenueAdjustmentDto } from './dto/create-revenue-adjustment.dto';
import { ReturnPaidOrderDto } from './dto/return-paid-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrderService, type OrderListView } from './order.service';

const orderListViews: OrderListView[] = ['detail', 'summary', 'pos'];

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  findAll(@Query('view') view?: string, @Query('status') status?: string) {
    return this.orderService.findAll({
      view: this.parseView(view),
      status: this.parseStatus(status),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orderService.create(dto, user.sub);
  }

  @Post('with-item')
  createWithItem(
    @Body() dto: CreateOrderWithItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.createWithItem(dto, user.sub);
  }

  @Post(':id/items')
  addItem(
    @Param('id') id: string,
    @Body() dto: AddOrderItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.addItem(id, dto, user.sub);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.updateItem(id, itemId, dto, user.sub);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.removeItem(id, itemId, user.sub);
  }

  @Post(':id/checkout')
  checkout(
    @Param('id') id: string,
    @Body() dto: CheckoutOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.checkout(id, dto, user.sub);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.cancel(id, dto, user.sub);
  }

  @Post(':id/returns')
  returnPaidItems(
    @Param('id') id: string,
    @Body() dto: ReturnPaidOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.returnPaidItems(id, dto, user.sub);
  }

  @Post(':id/adjustment')
  adjustment(
    @Param('id') id: string,
    @Body() dto: CreateRevenueAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orderService.createAdjustment(id, dto, user.sub);
  }

  private parseView(view?: string) {
    if (!view) {
      return undefined;
    }

    if (!orderListViews.includes(view as OrderListView)) {
      throw new BadRequestException('Invalid order list view');
    }

    return view as OrderListView;
  }

  private parseStatus(status?: string) {
    if (!status) {
      return undefined;
    }

    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException('Invalid order status');
    }

    return status as OrderStatus;
  }
}
