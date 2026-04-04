import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../lib/Slugify';
import * as bcrypt from 'bcrypt';
import { MAISON_MERE_DIRECTOR_ROLES } from './maison-mere-roles';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const orgName = this.config.getOrThrow<string>('SEED_ORGANIZATION_NAME');
      const adminEmail = this.config.getOrThrow<string>('SEED_ADMIN_EMAIL');
      const adminPassword = this.config.getOrThrow<string>(
        'SEED_ADMIN_PASSWORD',
      );
      const passwordRounds = Number(
        this.config.getOrThrow<string>('PASSWORD_ROUNDS'),
      );

      // Organisation mère : création si absente
      let organization = await this.prisma.organization.findFirst({
        where: {
          slug: slugify(orgName),
        },
      });
      if (!organization) {
        organization = await this.prisma.organization.create({
          data: {
            slug: slugify(orgName),
            name: orgName,
            organizationType: 'MAIN',
          },
        });

        Logger.log('Organisation mère créée avec succès');
      } else {
        Logger.log('Organisation mère déjà présente');
      }

      const adminRole = await this.prisma.role.upsert({
        where: { name: 'ADMIN' },
        create: {
          name: 'ADMIN',
          description: 'Rôle administrateur (global)',
        },
        update: {
          description: 'Rôle administrateur (global)',
          organizationScopeId: null,
        },
      });
      Logger.log('Rôle ADMIN assuré (sans périmètre organisation)');

      for (const def of MAISON_MERE_DIRECTOR_ROLES) {
        await this.prisma.role.upsert({
          where: { name: def.name },
          create: {
            name: def.name,
            description: def.description,
            organizationScopeId: organization.id,
          },
          update: {
            description: def.description,
            organizationScopeId: organization.id,
          },
        });
        Logger.log(`Rôle direction maison mère assuré : ${def.name}`);
      }

      let adminUser = await this.prisma.user.findUnique({
        where: {
          email: adminEmail,
        },
      });
      if (!adminUser) {
        adminUser = await this.prisma.user.create({
          data: {
            email: adminEmail,
            password: await bcrypt.hash(adminPassword, passwordRounds),
            organizationId: organization.id,
            roleId: adminRole.id,
          },
        });
        Logger.log('Utilisateur admin créé avec succès');
      } else {
        Logger.log('Utilisateur admin déjà présent');
      }
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }
}
