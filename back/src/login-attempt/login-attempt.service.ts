import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginAttempt, Prisma } from '../generated/prisma/client';

@Injectable()
export class LoginAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string): Promise<LoginAttempt> {
    const row = await this.prisma.loginAttempt.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Tentative de connexion introuvable');
    }
    return row;
  }

  async findByUserId(userId: string): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.LoginAttemptCreateInput): Promise<LoginAttempt> {
    return this.prisma.loginAttempt.create({ data });
  }
}
