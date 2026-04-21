import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../common/prisma/prisma.service';

type RegisterUserInput = {
  email: string;
  fullName: string;
  password: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: RegisterUserInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const userCount = await this.prisma.user.count();
    const passwordHash = await hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        passwordHash,
        role: userCount === 0 ? UserRole.ADMIN : UserRole.STAFF,
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

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async findById(id: string) {
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
      throw new NotFoundException('User not found');
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

  mapRole(role: UserRole): Role {
    return role === UserRole.ADMIN ? Role.ADMIN : Role.STAFF;
  }
}
