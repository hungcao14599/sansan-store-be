import { UserRole } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../common/prisma/prisma.service';
type RegisterUserInput = {
    email: string;
    fullName: string;
    password: string;
};
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: RegisterUserInput): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        createdAt: Date;
    }>;
    validateCredentials(email: string, password: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findById(id: string): Promise<{
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
    mapRole(role: UserRole): Role;
}
export {};
