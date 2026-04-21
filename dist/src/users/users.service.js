"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const role_enum_1 = require("../common/enums/role.enum");
const prisma_service_1 = require("../common/prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const existing = await this.prisma.user.findUnique({
            where: { email: data.email.toLowerCase() },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already exists');
        }
        const userCount = await this.prisma.user.count();
        const passwordHash = await (0, bcryptjs_1.hash)(data.password, 10);
        return this.prisma.user.create({
            data: {
                email: data.email.toLowerCase(),
                fullName: data.fullName,
                passwordHash,
                role: userCount === 0 ? client_1.UserRole.ADMIN : client_1.UserRole.STAFF,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
    }
    async validateCredentials(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await (0, bcryptjs_1.compare)(password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return user;
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async listUsers() {
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
    }
    mapRole(role) {
        return role === client_1.UserRole.ADMIN ? role_enum_1.Role.ADMIN : role_enum_1.Role.STAFF;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map