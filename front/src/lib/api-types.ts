/**
 * Formes minimales des réponses JSON API Nest + Prisma
 * (Decimal → string, Date → ISO).
 */

export type OrganizationDto = {
  id: string;
  name: string;
  slug: string;
  organizationType: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** GET `/poles`, POST `/poles` */
export type PoleDto = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

/** GET/PUT `/organisation/:id/catalog` */
export type OrganizationCatalogDto = {
  categoryIds: string[];
  productIds: string[];
};

export type RoleDto = {
  id: string;
  name: string;
  description: string | null;
  organizationScopeId: string | null;
  poleId: string | null;
};

export type PermissionDto = {
  id: string;
  name: string;
  description: string | null;
};

/** GET `/audit-log` — entrées ordonnées du plus récent au plus ancien. */
export type AuditLogListItemDto = {
  id: string;
  createdAt: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string | null;
  details: unknown;
  userId: string | null;
  organizationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  user: { id: string; email: string } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type PermissionRoleDto = {
  id: string;
  roleId: string;
  permissionId: string;
  permission: PermissionDto;
};

export type RolePoleSummaryDto = {
  id: string;
  code: string;
  name: string;
};

export type UserListItemDto = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePhotoUrl?: string | null;
  organizationId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    description: string | null;
    pole: RolePoleSummaryDto | null;
  };
  organization: OrganizationDto;
};

export type UserDetailDto = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePhotoUrl?: string | null;
  organizationId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  /** Auteur de la création (journal d’audit), si enregistré. */
  createdBy: { id: string; email: string } | null;
  role: {
    id: string;
    name: string;
    description: string | null;
    pole: RolePoleSummaryDto | null;
  };
  organization?: OrganizationDto;
};

export type CategoryDto = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
};

export type SupplierDto = {
  id: string;
  name: string;
  /** Prix de référence d’achat (FCFA). */
  price: string | number;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
};

/** Liaison produit ↔ fournisseur (réponse API Prisma). */
export type ProductSupplierLinkDto = {
  supplier: SupplierDto;
};

export type ProductDto = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  qrCode: string;
  /** Catalogue visible / vendable par les filiales (défini par la maison mère). */
  offeredToSubsidiaries: boolean;
  categoryId: string;
  category: CategoryDto;
  productSuppliers?: ProductSupplierLinkDto[];
};

export type StockDto = {
  id: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  organizationId: string;
  productId: string;
  product: ProductDto;
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationType?: "MAIN" | "SUBSIDIARY";
  };
};

export type StockOrderStatusDto = "PENDING" | "CONFIRMED" | "CANCELLED";

export type StockOrderDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  subsidiaryOrganizationId: string;
  productId: string;
  supplierId: string;
  /** Prix unitaire FCFA figé à la création de la commande. */
  unitPrice: string | number;
  quantity: number;
  status: StockOrderStatusDto;
  note: string | null;
  requestedByUserId: string | null;
  product: ProductDto;
  supplier: SupplierDto;
  subsidiaryOrganization: {
    id: string;
    name: string;
    slug: string;
    organizationType: "MAIN" | "SUBSIDIARY";
  };
  requestedBy: { id: string; email: string } | null;
};

export type BudgetStatusDto = "DRAFT" | "APPROVED";

export type BudgetLineCategoryDto = "LOYER" | "SALAIRE";

export type BudgetLineDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  budgetId: string;
  category: BudgetLineCategoryDto;
  label: string;
  amountPlanned: string | number;
};

export type BudgetDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  subsidiaryOrganizationId: string;
  year: number;
  month: number;
  status: BudgetStatusDto;
  subsidiaryOrganization: {
    id: string;
    name: string;
    slug: string;
    organizationType: "MAIN" | "SUBSIDIARY";
  };
  lines: BudgetLineDto[];
};

/** GET `/budget/:budgetId/expenses` */
export type EmployeeStatusDto =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

export type LeaveStatusDto = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type EmploymentContractTypeDto =
  | "CDI"
  | "CDD"
  | "STAGE"
  | "INTERIM"
  | "OTHER";

export type EmploymentContractStatusDto = "ACTIVE" | "EXPIRED" | "TERMINATED";

export type HrEmployeeSummaryDto = {
  id: string;
  firstName: string;
  lastName: string;
};

export type DepartmentDto = {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  status: EmployeeStatusDto;
  hireDate: string;
  terminationDate: string | null;
  organizationId: string;
  departmentId: string | null;
  managerId: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  department: { id: string; name: string } | null;
  manager: HrEmployeeSummaryDto | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type LeaveRequestDto = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatusDto;
  employeeId: string;
  approvedById: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  employee: HrEmployeeSummaryDto & { organizationId: string };
  approvedBy: HrEmployeeSummaryDto | null;
};

export type LeaveBalanceDto = {
  id: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  carriedOverDays: number;
  periodLabel: string;
  employeeId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  employee: HrEmployeeSummaryDto;
};

export type EmploymentContractDto = {
  id: string;
  type: EmploymentContractTypeDto;
  status: EmploymentContractStatusDto;
  startDate: string;
  endDate: string | null;
  note: string | null;
  employeeId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  employee: HrEmployeeSummaryDto;
};

export type EmployeeSalaryDto = {
  id: string;
  amount: string | number;
  effectiveFrom: string;
  effectiveTo: string | null;
  label: string | null;
  employeeId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  employee: HrEmployeeSummaryDto;
};

export type BudgetExpenseDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  budgetLineId: string;
  amount: string | number;
  label: string | null;
  spentAt: string;
  recordedByUserId: string | null;
  budgetLine: {
    id: string;
    label: string;
    category: BudgetLineCategoryDto;
    budgetId: string;
  };
  recordedBy: { id: string; email: string } | null;
};
