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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const users_service_1 = require("../../users/users.service");
const AUTH_USER_CACHE_TTL_MS = 30_000;
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    usersService;
    userCache = new Map();
    userLookupPromises = new Map();
    constructor(configService, usersService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow('JWT_SECRET'),
        });
        this.usersService = usersService;
    }
    async validate(payload) {
        const cached = this.getCachedPayload(payload.sub);
        if (cached) {
            return cached;
        }
        const pendingLookup = this.userLookupPromises.get(payload.sub);
        if (pendingLookup) {
            return pendingLookup;
        }
        const lookup = this.loadActiveUserPayload(payload.sub);
        this.userLookupPromises.set(payload.sub, lookup);
        try {
            return await lookup;
        }
        finally {
            this.userLookupPromises.delete(payload.sub);
        }
    }
    getCachedPayload(userId) {
        const cached = this.userCache.get(userId);
        if (!cached) {
            return null;
        }
        if (cached.expiresAt <= Date.now()) {
            this.userCache.delete(userId);
            return null;
        }
        return cached.payload;
    }
    async loadActiveUserPayload(userId) {
        const user = await this.usersService.findActiveAuthUserById(userId);
        if (!user) {
            this.userCache.delete(userId);
            throw new common_1.UnauthorizedException('Invalid or expired session');
        }
        const nextPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
        };
        this.userCache.set(user.id, {
            payload: nextPayload,
            expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
        });
        return nextPayload;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        users_service_1.UsersService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map