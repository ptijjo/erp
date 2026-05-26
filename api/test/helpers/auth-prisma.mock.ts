import type { UserWithRoleAndOrg } from '../../src/user/user.types';

export type PermissionRoleLink = {
  permission: { name: string };
};

export type AuthPrismaMockOptions = {
  /** Permissions CASL par `roleId` (filiale, rôles custom, etc.). */
  permissionRolesByRoleId?: Record<string, PermissionRoleLink[]>;
};

export type AuthPrismaMock = {
  loginAttempt: { create: jest.Mock };
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  permissionRole: { findMany: jest.Mock };
  pole?: { findMany: jest.Mock };
  budget?: {
    findMany?: jest.Mock;
    findFirst?: jest.Mock;
    findUnique?: jest.Mock;
    count?: jest.Mock;
    update?: jest.Mock;
  };
  budgetLine?: { findUnique?: jest.Mock; findFirst?: jest.Mock };
  budgetExpense?: {
    create?: jest.Mock;
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    delete?: jest.Mock;
    aggregate?: jest.Mock;
  };
  budgetSupplementRequest?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    count?: jest.Mock;
  };
  stockOrder?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    update?: jest.Mock;
    count?: jest.Mock;
    groupBy?: jest.Mock;
  };
  organization?: { count?: jest.Mock; findMany?: jest.Mock };
  product?: { count?: jest.Mock };
  stock?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    update?: jest.Mock;
  };
  sessionCaisse?: {
    findFirst?: jest.Mock;
    findUnique?: jest.Mock;
    findMany?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
  };
  vente?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    findUniqueOrThrow?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    count?: jest.Mock;
    aggregate?: jest.Mock;
  };
  venteLine?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    findFirst?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    delete?: jest.Mock;
  };
  ventePaiement?: {
    deleteMany?: jest.Mock;
    createMany?: jest.Mock;
  };
  $transaction?: jest.Mock;
  department?: {
    findMany?: jest.Mock;
    count?: jest.Mock;
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    delete?: jest.Mock;
  };
  employee?: {
    findMany?: jest.Mock;
    count?: jest.Mock;
    groupBy?: jest.Mock;
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    delete?: jest.Mock;
  };
  leaveRequest?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    count?: jest.Mock;
    groupBy?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    delete?: jest.Mock;
  };
  leaveBalance?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    delete?: jest.Mock;
  };
  employmentContract?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    delete?: jest.Mock;
  };
  employeeSalary?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    delete?: jest.Mock;
  };
};

export function createAuthPrismaMock(
  users: UserWithRoleAndOrg | UserWithRoleAndOrg[],
  options?: AuthPrismaMockOptions,
): AuthPrismaMock {
  const rows = Array.isArray(users) ? users : [users];

  const loginAttempt = { create: jest.fn().mockResolvedValue({}) };
  const permissionRole = {
    findMany: jest.fn(
      async (args: { where: { roleId: string } }): Promise<PermissionRoleLink[]> => {
        return options?.permissionRolesByRoleId?.[args.where.roleId] ?? [];
      },
    ),
  };

  const user = {
    findUnique: jest.fn(
      async (args: { where: { email?: string; id?: string } }) => {
        if (args.where.email) {
          return rows.find((r) => r.email === args.where.email) ?? null;
        }
        if (args.where.id) {
          return rows.find((r) => r.id === args.where.id) ?? null;
        }
        return null;
      },
    ),
    update: jest.fn(async (args: { where: { id: string } }) => {
      return rows.find((r) => r.id === args.where.id) ?? rows[0]!;
    }),
  };

  return { loginAttempt, user, permissionRole };
}
