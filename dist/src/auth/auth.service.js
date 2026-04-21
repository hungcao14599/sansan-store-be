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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const audit_log_service_1 = require("../audit-log/audit-log.service");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    usersService;
    jwtService;
    auditLogService;
    constructor(usersService, jwtService, auditLogService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
    }
    async register(dto) {
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
    async login(dto) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        audit_log_service_1.AuditLogService])
], AuthService);
//# sourceMappingURL=auth.service.js.map