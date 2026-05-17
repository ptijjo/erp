import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../lib/Slugify';
import * as bcrypt from 'bcrypt';
import { MAISON_MERE_DIRECTOR_ROLES } from './maison-mere-roles';
import { MAISON_MERE_POLES } from './maison-mere-poles';
import {
  CASL_SEED_PERMISSION_NAMES,
  describeCaslPermission,
} from './casl-permission-names';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const orgName = this.config.getOrThrow<string>('SEED_ORGANIZATION_NAME');
      const adminEmail =
        this.config.get<string>('EMAIL_ADMIN')?.trim() ||
        this.config.getOrThrow<string>('SEED_ADMIN_EMAIL');
      const adminPassword =
        this.config.get<string>('PASSWORD_ADMIN')?.trim() ||
        this.config.getOrThrow<string>('SEED_ADMIN_PASSWORD');
      const adminFirstName =
        this.config.get<string>('SEED_ADMIN_FIRST_NAME')?.trim() ?? '';
      const adminLastName =
        this.config.get<string>('SEED_ADMIN_LAST_NAME')?.trim() ?? '';
      const firstNameValue =
        adminFirstName.length > 0 ? adminFirstName : null;
      const lastNameValue = adminLastName.length > 0 ? adminLastName : null;
      const seedAdminRoleName = this.config
        .getOrThrow<string>('SEED_ADMIN_ROLE')
        .trim()
        .toUpperCase();
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

      const poleIdByCode = new Map<string, string>();
      for (const poleDef of MAISON_MERE_POLES) {
        const pole = await this.prisma.pole.upsert({
          where: { code: poleDef.code },
          create: {
            code: poleDef.code,
            name: poleDef.name,
            description: poleDef.description,
          },
          update: {
            name: poleDef.name,
            description: poleDef.description,
          },
        });
        poleIdByCode.set(poleDef.code, pole.id);
        Logger.log(`Pôle assuré : ${poleDef.code}`);
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
          poleId: null,
        },
      });
      Logger.log('Rôle ADMIN assuré (sans périmètre organisation)');

      for (const name of CASL_SEED_PERMISSION_NAMES) {
        await this.prisma.permission.upsert({
          where: { name },
          create: {
            name,
            description: describeCaslPermission(name),
          },
          update: {
            description: describeCaslPermission(name),
          },
        });
      }
      Logger.log(
        `Permissions CASL en base : ${CASL_SEED_PERMISSION_NAMES.length} entrées (catalogue PERMISSIONS-CASL.md)`,
      );

      for (const def of MAISON_MERE_DIRECTOR_ROLES) {
        const poleDef = MAISON_MERE_POLES.find(
          (p) => p.directorRoleName === def.name,
        );
        const poleId = poleDef ? poleIdByCode.get(poleDef.code) : null;
        await this.prisma.role.upsert({
          where: { name: def.name },
          create: {
            name: def.name,
            description: def.description,
            organizationScopeId: organization.id,
            poleId,
          },
          update: {
            description: def.description,
            organizationScopeId: organization.id,
            poleId,
          },
        });
        Logger.log(`Rôle direction maison mère assuré : ${def.name}`);
      }

      const provisionRole = await this.prisma.role.findUnique({
        where: { name: seedAdminRoleName },
      });
      if (!provisionRole) {
        throw new Error(
          `SEED_ADMIN_ROLE="${seedAdminRoleName}" : rôle introuvable après initialisation (ex. ADMIN, DIRECTOR_GENERAL).`,
        );
      }

      let adminUser = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });
      if (!adminUser && seedAdminRoleName === 'ADMIN') {
        adminUser = await this.prisma.user.findFirst({
          where: { role: { name: 'ADMIN' } },
        });
      }
      if (!adminUser) {
        adminUser = await this.prisma.user.create({
          data: {
            email: adminEmail,
            password: await bcrypt.hash(adminPassword, passwordRounds),
            organizationId: organization.id,
            roleId: provisionRole.id,
            firstName: firstNameValue,
            lastName: lastNameValue,
            firstLogin: false,
          },
        });
        Logger.log('Utilisateur provisionné (admin) créé avec succès');
      } else {
        await this.prisma.user.update({
          where: { id: adminUser.id },
          data: {
            email: adminEmail,
            roleId: provisionRole.id,
            firstName: firstNameValue,
            lastName: lastNameValue,
            firstLogin: false,
          },
        });
        Logger.log(
          'Utilisateur provisionné déjà présent (rôle, email et identité synchronisés)',
        );
      }

      const auditRead = await this.prisma.permission.findUnique({
        where: { name: 'read:AuditLog' },
      });
      if (auditRead) {
        const directorRoles = await this.prisma.role.findMany({
          where: {
            name: { in: ['DIRECTOR_GENERAL', 'DIRECTOR_OPERATIONS'] },
          },
          select: { id: true },
        });
        const roleIds = [adminRole.id, ...directorRoles.map((r) => r.id)];

        for (const roleId of roleIds) {
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: auditRead.id,
                roleId,
              },
            },
            create: {
              permissionId: auditRead.id,
              roleId,
            },
            update: {},
          });
        }
        Logger.log(
          'Permission read:AuditLog liée à ADMIN, DIRECTOR_GENERAL et DIRECTOR_OPERATIONS',
        );
      }

      const stockReadPerm = await this.prisma.permission.findUnique({
        where: { name: 'read:Stock' },
      });
      const stockOrderNames = [
        'read:StockOrder',
        'create:StockOrder',
        'update:StockOrder',
        'delete:StockOrder',
      ] as const;
      if (stockReadPerm) {
        const roleLinks = await this.prisma.permissionRole.findMany({
          where: { permissionId: stockReadPerm.id },
          select: { roleId: true },
        });
        for (const permName of stockOrderNames) {
          const perm = await this.prisma.permission.findUnique({
            where: { name: permName },
          });
          if (!perm) continue;
          for (const { roleId } of roleLinks) {
            await this.prisma.permissionRole.upsert({
              where: {
                permissionId_roleId: {
                  permissionId: perm.id,
                  roleId,
                },
              },
              create: {
                permissionId: perm.id,
                roleId,
              },
              update: {},
            });
          }
        }
        Logger.log(
          'Permissions StockOrder alignées sur les rôles ayant read:Stock',
        );
      }

      const supplierNames = [
        'read:Supplier',
        'create:Supplier',
        'update:Supplier',
        'delete:Supplier',
      ] as const;
      const directorRoleNames = MAISON_MERE_DIRECTOR_ROLES.map((d) => d.name);
      const supplierRoles = await this.prisma.role.findMany({
        where: {
          OR: [
            { name: 'ADMIN' },
            { name: { in: [...directorRoleNames] } },
          ],
        },
        select: { id: true },
      });
      for (const permName of supplierNames) {
        const perm = await this.prisma.permission.findUnique({
          where: { name: permName },
        });
        if (!perm) continue;
        for (const { id: roleId } of supplierRoles) {
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: perm.id,
                roleId,
              },
            },
            create: {
              permissionId: perm.id,
              roleId,
            },
            update: {},
          });
        }
      }
      if (supplierRoles.length > 0) {
        Logger.log(
          'Permissions Supplier liées à ADMIN et aux rôles direction maison mère',
        );
      }

      const budgetCrudNames = [
        'read:Budget',
        'create:Budget',
        'update:Budget',
        'delete:Budget',
      ] as const;
      for (const permName of budgetCrudNames) {
        const perm = await this.prisma.permission.findUnique({
          where: { name: permName },
        });
        if (!perm) continue;
        for (const { id: roleId } of supplierRoles) {
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: perm.id,
                roleId,
              },
            },
            create: {
              permissionId: perm.id,
              roleId,
            },
            update: {},
          });
        }
      }
      if (supplierRoles.length > 0) {
        Logger.log(
          'Permissions Budget liées à ADMIN et aux rôles direction maison mère',
        );
      }

      const budgetReadPerm = await this.prisma.permission.findUnique({
        where: { name: 'read:Budget' },
      });
      if (budgetReadPerm && stockReadPerm) {
        const stockReadLinks = await this.prisma.permissionRole.findMany({
          where: { permissionId: stockReadPerm.id },
          select: { roleId: true },
        });
        for (const { roleId } of stockReadLinks) {
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: budgetReadPerm.id,
                roleId,
              },
            },
            create: {
              permissionId: budgetReadPerm.id,
              roleId,
            },
            update: {},
          });
        }
        if (stockReadLinks.length > 0) {
          Logger.log(
            'Permission read:Budget alignée sur les rôles ayant read:Stock',
          );
        }
      }
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }
}
