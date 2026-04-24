import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProductGroupDto } from './dto/create-product-group.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ExportProductsDto } from './dto/export-products.dto';
import { ListProductGroupsDto } from './dto/list-product-groups.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdateProductGroupDto } from './dto/update-product-group.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.productService.findAll();
  }

  @Get('search')
  search(@Query() query: SearchProductsDto) {
    return this.productService.search(query);
  }

  @Get('export')
  @Roles(Role.ADMIN)
  async exportProducts(
    @Query() query: ExportProductsDto,
    @Res() res: Response,
  ) {
    const { buffer, filename } =
      await this.productService.exportProducts(query);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('groups')
  @Roles(Role.ADMIN)
  findGroups(@Query() query: ListProductGroupsDto) {
    return this.productService.findGroups(query);
  }

  @Post('groups')
  @Roles(Role.ADMIN)
  createGroup(
    @Body() dto: CreateProductGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.createGroup(dto, user.sub);
  }

  @Patch('groups/:id')
  @Roles(Role.ADMIN)
  updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdateProductGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.updateGroup(id, dto, user.sub);
  }

  @Delete('groups/:id')
  @Roles(Role.ADMIN)
  removeGroup(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productService.removeGroup(id, user.sub);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productService.remove(id, user.sub);
  }
}
