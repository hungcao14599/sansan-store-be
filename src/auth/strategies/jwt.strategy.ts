import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  fullName: string;
};

type CachedJwtPayload = {
  payload: JwtPayload;
  expiresAt: number;
};

const AUTH_USER_CACHE_TTL_MS = 30_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly userCache = new Map<string, CachedJwtPayload>();
  private readonly userLookupPromises = new Map<string, Promise<JwtPayload>>();

  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
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
    } finally {
      this.userLookupPromises.delete(payload.sub);
    }
  }

  private getCachedPayload(userId: string) {
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

  private async loadActiveUserPayload(userId: string) {
    const user = await this.usersService.findActiveAuthUserById(userId);

    if (!user) {
      this.userCache.delete(userId);
      throw new UnauthorizedException('Invalid or expired session');
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
}
