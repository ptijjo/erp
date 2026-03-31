import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findUser(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  public findAll = async (): Promise<Omit<User, 'password'>[]> => {
    const users = await this.prisma.user.findMany({
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    return users.map((user) => ({
      ...user,
      password: undefined,
    }));
  };

  public findOne = async (id: string): Promise<Omit<User, 'password'>> => {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organizationId: user.organizationId,
    };
  };

  public create = async (
    user: CreateUserDto,
    organizationId: string,
  ): Promise<Omit<User, 'password'>> => {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: user.email,
      },
    });
    if (existingUser) {
      throw new ConflictException('Utilisateur déjà existant');
    }
    const newUser = await this.prisma.user.create({
      data: {
        ...user,
        password: await bcrypt.hash(
          user.password,
          Number(process.env.PASSWORD_ROUNDS),
        ),
        organizationId,
      },
    });
    return {
      id: newUser.id,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      organizationId: newUser.organizationId,
    };
  };

  public update = async (
    id: string,
    user: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> => {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...user,
        password: user.password
          ? await bcrypt.hash(
              user.password,
              Number(process.env.PASSWORD_ROUNDS),
            )
          : undefined,
        organizationId: user.organizationId
          ? user.organizationId
          : existingUser.organizationId,
      },
    });
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      organizationId: updatedUser.organizationId,
    };
  };

  public delete = async (id: string): Promise<Omit<User, 'password'>> => {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    await this.prisma.user.delete({ where: { id } });
    return {
      id: existingUser.id,
      email: existingUser.email,
      createdAt: existingUser.createdAt,
      updatedAt: existingUser.updatedAt,
      organizationId: existingUser.organizationId,
    };
  };
}
