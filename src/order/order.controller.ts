import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { CreateRevenueAdjustmentDto } from './dto/create-revenue-adjustment.dto';
import { ReturnPaidOrderDto } from './dto/return-paid-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrderService } from './order.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.orderService.create(dto, user.sub);
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
}
