import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.sub,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: true,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  listUsers() {
    return this.usersService.listUsers();
  }
}
