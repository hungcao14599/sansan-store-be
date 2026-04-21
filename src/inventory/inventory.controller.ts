import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll() {
    return this.inventoryService.findAll();
  }

  @Patch(':productId/adjust')
  @Roles(Role.ADMIN)
  adjust(
    @Param('productId') productId: string,
    @Body() dto: AdjustInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.adjust(productId, dto, user.sub);
  }
}
