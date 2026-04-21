import { type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(user: AuthenticatedUser): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listUsers(): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        createdAt: Date;
    }[]>;
}
