import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly auditLogService;
    constructor(usersService: UsersService, jwtService: JwtService, auditLogService: AuditLogService);
    register(dto: RegisterDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        createdAt: Date;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
    }>;
}
