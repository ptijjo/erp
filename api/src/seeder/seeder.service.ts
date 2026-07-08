import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../lib/Slugify';
import * as bcrypt from 'bcrypt';
import { MAISON_MERE_DIRECTOR_ROLES } from './maison-mere-roles';
import { MAISON_MERE_POLES } from './maison-mere-poles';
import {
  CASL_SEED_PERMISSION_NAMES,
  describeCaslPermission,
} from './casl-permission-names';
import { SUBSIDIARY_MANAGER_PERMISSION_NAMES } from './subsidiary-manager-permissions';

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

      let adminRole = await this.prisma.role.findFirst({
        where: { name: 'ADMIN', organizationScopeId: null },
      });
      if (!adminRole) {
        adminRole = await this.prisma.role.create({
          data: {
            name: 'ADMIN',
            description: 'Rôle administrateur (global)',
          },
        });
      } else {
        adminRole = await this.prisma.role.update({
          where: { id: adminRole.id },
          data: {
            description: 'Rôle administrateur (global)',
            organizationScopeId: null,
            poleId: null,
          },
        });
      }
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
          where: {
            name_organizationScopeId: {
              name: def.name,
              organizationScopeId: organization.id,
            },
          },
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

      const provisionScopeId =
        seedAdminRoleName === 'ADMIN' ? null : organization.id;
      const provisionRole = await this.prisma.role.findFirst({
        where: {
          name: seedAdminRoleName,
          organizationScopeId: provisionScopeId,
        },
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
            organizationScopeId: organization.id,
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

      const venteNames = [
        'read:Vente',
        'create:Vente',
        'update:Vente',
        'delete:Vente',
      ] as const;
      if (stockReadPerm) {
        for (const permName of venteNames) {
          const perm = await this.prisma.permission.findUnique({
            where: { name: permName },
          });
          if (!perm) continue;
          const roleLinks = await this.prisma.permissionRole.findMany({
            where: { permissionId: stockReadPerm.id },
            select: { roleId: true },
          });
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
          'Permissions Vente alignées sur les rôles ayant read:Stock',
        );
      }

      const sessionCaisseNames = [
        'read:SessionCaisse',
        'create:SessionCaisse',
        'update:SessionCaisse',
      ] as const;
      if (stockReadPerm) {
        const roleLinks = await this.prisma.permissionRole.findMany({
          where: { permissionId: stockReadPerm.id },
          select: { roleId: true },
        });
        for (const permName of sessionCaisseNames) {
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
          'Permissions SessionCaisse alignées sur les rôles ayant read:Stock',
        );

        const stockExtendedNames = [
          'read:StockMovement',
          'read:StockTransfer',
          'create:StockTransfer',
          'update:StockTransfer',
          'delete:StockTransfer',
        ] as const;
        for (const permName of stockExtendedNames) {
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
          'Permissions StockMovement / StockTransfer alignées sur read:Stock',
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
            { name: 'ADMIN', organizationScopeId: null },
            {
              name: { in: [...directorRoleNames] },
              organizationScopeId: organization.id,
            },
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

      const budgetReadPerm = await this.prisma.permission.findUnique({
        where: { name: 'read:Budget' },
      });
      if (budgetReadPerm) {
        for (const { id: roleId } of supplierRoles) {
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
        Logger.log(
          'Permission read:Budget liée aux rôles direction maison mère',
        );
      }


      const budgetWriteRoles = await this.prisma.role.findMany({
        where: {
          OR: [
            { name: 'ADMIN', organizationScopeId: null },
            {
              name: {
                in: [
                  'DIRECTOR_GENERAL',
                  'DIRECTOR_OPERATIONS',
                  'DIRECTOR_FINANCE',
                ],
              },
              organizationScopeId: organization.id,
            },
          ],
        },
        select: { id: true },
      });
      const budgetWritePermNames = [
        'create:Budget',
        'update:Budget',
        'delete:Budget',
      ] as const;
      for (const permName of budgetWritePermNames) {
        const perm = await this.prisma.permission.findUnique({
          where: { name: permName },
        });
        if (!perm) continue;
        for (const { id: roleId } of budgetWriteRoles) {
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
      if (budgetWriteRoles.length > 0) {
        Logger.log(
          'Permissions Budget (écriture) liées à ADMIN, DG, opérations et finance',
        );
      }

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

      const supplementMainPermNames = [
        'read:BudgetSupplementRequest',
        'update:BudgetSupplementRequest',
        'delete:BudgetSupplementRequest',
      ] as const;
      for (const permName of supplementMainPermNames) {
        const perm = await this.prisma.permission.findUnique({
          where: { name: permName },
        });
        if (!perm) continue;
        for (const { id: roleId } of budgetWriteRoles) {
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

      const budgetExpenseCreatePerm = await this.prisma.permission.findUnique({
        where: { name: 'create:BudgetExpense' },
      });
      if (budgetExpenseCreatePerm && budgetReadPerm) {
        const budgetReadLinks = await this.prisma.permissionRole.findMany({
          where: { permissionId: budgetReadPerm.id },
          select: { roleId: true },
        });
        for (const { roleId } of budgetReadLinks) {
          const role = await this.prisma.role.findUnique({
            where: { id: roleId },
            select: { organizationScopeId: true },
          });
          if (!role?.organizationScopeId) {
            continue;
          }
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: budgetExpenseCreatePerm.id,
                roleId,
              },
            },
            create: {
              permissionId: budgetExpenseCreatePerm.id,
              roleId,
            },
            update: {},
          });
          for (const extra of [
            'read:BudgetSupplementRequest',
            'create:BudgetSupplementRequest',
          ] as const) {
            const extraPerm = await this.prisma.permission.findUnique({
              where: { name: extra },
            });
            if (!extraPerm) continue;
            await this.prisma.permissionRole.upsert({
              where: {
                permissionId_roleId: {
                  permissionId: extraPerm.id,
                  roleId,
                },
              },
              create: {
                permissionId: extraPerm.id,
                roleId,
              },
              update: {},
            });
          }
        }
        Logger.log(
          'Permissions sorties et demandes de rallonge alignées sur les rôles filiale ayant read:Budget',
        );
      }

      const subsidiaryRoles = await this.prisma.role.findMany({
        where: {
          organizationScopeId: { not: null },
          organizationScope: {
            organizationType: OrganizationType.SUBSIDIARY,
          },
        },
        select: { id: true, name: true },
      });
      let subsidiaryLinks = 0;
      for (const role of subsidiaryRoles) {
        for (const permName of SUBSIDIARY_MANAGER_PERMISSION_NAMES) {
          const perm = await this.prisma.permission.findUnique({
            where: { name: permName },
          });
          if (!perm) continue;
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: perm.id,
                roleId: role.id,
              },
            },
            create: {
              permissionId: perm.id,
              roleId: role.id,
            },
            update: {},
          });
          subsidiaryLinks += 1;
        }
      }
      if (subsidiaryRoles.length > 0) {
        Logger.log(
          `Permissions manager filiale : ${subsidiaryLinks} liaisons pour ${subsidiaryRoles.length} rôle(s) scoppé(s) (${SUBSIDIARY_MANAGER_PERMISSION_NAMES.length} droits métier)`,
        );
      }

      const hrDirectorRole = await this.prisma.role.findUnique({
        where: {
          name_organizationScopeId: {
            name: 'DIRECTOR_HR',
            organizationScopeId: organization.id,
          },
        },
        select: { id: true },
      });
      if (hrDirectorRole) {
        const hrPermissionNames = [
          'read:all',
          'read:Department',
          'create:Department',
          'update:Department',
          'delete:Department',
          'read:Employee',
          'create:Employee',
          'update:Employee',
          'delete:Employee',
          'read:LeaveRequest',
          'create:LeaveRequest',
          'update:LeaveRequest',
          'delete:LeaveRequest',
          'read:LeaveBalance',
          'create:LeaveBalance',
          'update:LeaveBalance',
          'delete:LeaveBalance',
          'read:EmploymentContract',
          'create:EmploymentContract',
          'update:EmploymentContract',
          'delete:EmploymentContract',
          'read:EmployeeSalary',
          'create:EmployeeSalary',
          'update:EmployeeSalary',
          'delete:EmployeeSalary',
          // Sanctions et départs : gérés aussi par le DRH maison mère.
          // Le planning (WorkShift) reste réservé aux filiales (directeur de filiale).
          'read:EmployeeSanction',
          'create:EmployeeSanction',
          'update:EmployeeSanction',
          'delete:EmployeeSanction',
          'read:EmployeeDeparture',
          'create:EmployeeDeparture',
          'update:EmployeeDeparture',
          'delete:EmployeeDeparture',
        ] as const;
        for (const permName of hrPermissionNames) {
          const perm = await this.prisma.permission.findUnique({
            where: { name: permName },
          });
          if (!perm) continue;
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: perm.id,
                roleId: hrDirectorRole.id,
              },
            },
            create: {
              permissionId: perm.id,
              roleId: hrDirectorRole.id,
            },
            update: {},
          });
        }
        Logger.log(
          'Permissions RH (read:all + CRUD métier) liées à DIRECTOR_HR',
        );
      }

      const allRoles = await this.prisma.role.findMany({ select: { id: true } });
      for (const permName of ['read:Notification', 'update:Notification'] as const) {
        const perm = await this.prisma.permission.findUnique({
          where: { name: permName },
        });
        if (!perm) continue;
        for (const { id: roleId } of allRoles) {
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: { permissionId: perm.id, roleId },
            },
            create: { permissionId: perm.id, roleId },
            update: {},
          });
        }
      }
      Logger.log('Permissions Notification liées à tous les rôles');

      for (const permName of [
        'read:Message',
        'create:Message',
        'update:Message',
      ] as const) {
        const perm = await this.prisma.permission.findUnique({
          where: { name: permName },
        });
        if (!perm) continue;
        for (const { id: roleId } of allRoles) {
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: { permissionId: perm.id, roleId },
            },
            create: { permissionId: perm.id, roleId },
            update: {},
          });
        }
      }
      Logger.log('Permissions Message (messagerie) liées à tous les rôles');

      for (const permName of [
        'read:Task',
        'create:Task',
        'update:Task',
        'delete:Task',
      ] as const) {
        const perm = await this.prisma.permission.findUnique({
          where: { name: permName },
        });
        if (!perm) continue;
        for (const { id: roleId } of allRoles) {
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: { permissionId: perm.id, roleId },
            },
            create: { permissionId: perm.id, roleId },
            update: {},
          });
        }
      }
      Logger.log('Permissions Task (Mes actions) liées à tous les rôles');

      const budgetReadForAccounting = await this.prisma.permission.findUnique({
        where: { name: 'read:Budget' },
      });
      if (budgetReadForAccounting) {
        const budgetRoleLinks = await this.prisma.permissionRole.findMany({
          where: { permissionId: budgetReadForAccounting.id },
          select: { roleId: true },
        });
        const readAccounting = await this.prisma.permission.findUnique({
          where: { name: 'read:AccountingPeriod' },
        });
        if (readAccounting) {
          for (const { roleId } of budgetRoleLinks) {
            await this.prisma.permissionRole.upsert({
              where: {
                permissionId_roleId: {
                  permissionId: readAccounting.id,
                  roleId,
                },
              },
              create: { permissionId: readAccounting.id, roleId },
              update: {},
            });
          }
        }
      }

      const manageAccounting = await this.prisma.permission.findUnique({
        where: { name: 'manage:AccountingPeriod' },
      });
      if (manageAccounting) {
        for (const roleName of [
          'ADMIN',
          'DIRECTOR_GENERAL',
          'DIRECTOR_OPERATIONS',
          'DIRECTOR_FINANCE',
        ]) {
          const role = await this.prisma.role.findFirst({
            where: {
              name: roleName,
              organizationScopeId:
                roleName === 'ADMIN' ? null : organization.id,
            },
          });
          if (!role) continue;
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: manageAccounting.id,
                roleId: role.id,
              },
            },
            create: { permissionId: manageAccounting.id, roleId: role.id },
            update: {},
          });
        }
        Logger.log(
          'Permissions clôture comptable (manage) liées aux rôles direction',
        );
      }

      const poleModuleLinks: Array<{
        roleName: string;
        permissions: readonly string[];
      }> = [
        {
          roleName: 'DIRECTOR_ARCHITECTURE_HERITAGE',
          permissions: [
            'read:HeritageAsset',
            'create:HeritageAsset',
            'update:HeritageAsset',
            'delete:HeritageAsset',
          ],
        },
        {
          roleName: 'DIRECTOR_LEGAL',
          permissions: [
            'read:LegalContract',
            'create:LegalContract',
            'update:LegalContract',
            'delete:LegalContract',
          ],
        },
        {
          roleName: 'DIRECTOR_PRODUCTION',
          permissions: [
            'read:ProductionOrder',
            'create:ProductionOrder',
            'update:ProductionOrder',
            'delete:ProductionOrder',
          ],
        },
      ];
      for (const link of poleModuleLinks) {
        const role = await this.prisma.role.findUnique({
          where: {
            name_organizationScopeId: {
              name: link.roleName,
              organizationScopeId: organization.id,
            },
          },
        });
        if (!role) continue;
        for (const permName of link.permissions) {
          const perm = await this.prisma.permission.findUnique({
            where: { name: permName },
          });
          if (!perm) continue;
          await this.prisma.permissionRole.upsert({
            where: {
              permissionId_roleId: {
                permissionId: perm.id,
                roleId: role.id,
              },
            },
            create: { permissionId: perm.id, roleId: role.id },
            update: {},
          });
        }
      }
      Logger.log('Permissions modules pôle (Patrimoine, Juridique, Production) liées');
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }
}
