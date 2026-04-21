import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);

    await this.auditLogService.create({
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'auth.register',
      metadata: {
        email: user.email,
        role: user.role,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.validateCredentials(dto.email, dto.password);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    await this.auditLogService.create({
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: 'auth.login',
      metadata: {
        email: user.email,
      },
    });

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
