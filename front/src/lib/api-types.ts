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
  bio?: string | null;
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

export type StockOrderBudgetLinkDto = {
  linked: boolean;
  reason?: string;
};

export type VenteStatutDto = "DRAFT" | "CONFIRMED" | "CANCELLED";

export type ModePaiementDto = "ESPECES" | "CARTE" | "MOBILE_MONEY";

export type VenteLineDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  quantity: number;
  unitPrice: string | number;
  venteId: string;
  productId: string;
  product: {
    id: string;
    name: string;
    qrCode: string;
    price: string | number;
    category: { id: string; name: string };
  };
};

export type VentePaiementDto = {
  id: string;
  modePaiement: ModePaiementDto;
  amount: string | number;
};

export type VenteDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: VenteStatutDto;
  totalAmount: string | number;
  numeroTicket: number | null;
  sessionCaisseId: string | null;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationType: "MAIN" | "SUBSIDIARY";
  };
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  lines: VenteLineDto[];
  paiements: VentePaiementDto[];
};

export type LowStockAlertDto = {
  productId: string;
  productName: string;
  quantity: number;
  minQuantity: number;
};

export type ConfirmVenteDto = VenteDto & {
  lowStockAlerts: LowStockAlertDto[];
};

export type SessionCaisseStatutDto = "OUVERTE" | "CLOTUREE";

export type SessionCaisseLiveDto = {
  nombreVentes: number;
  totalVentesFcfa: number;
  totalEspecesFcfa: number;
  totalCarteFcfa: number;
  totalMobileMoneyFcfa: number;
  theoriqueCaisseEspecesFcfa: number;
};

export type SessionCaisseDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  statut: SessionCaisseStatutDto;
  openedAt: string;
  closedAt: string | null;
  fondOuverture: string | number;
  fondCloture: string | number | null;
  ecartCloture: string | number | null;
  commentaireCloture: string | null;
  totalVentesFcfa: string | number | null;
  totalEspecesFcfa: string | number | null;
  totalCarteFcfa: string | number | null;
  totalMobileMoneyFcfa: string | number | null;
  nombreVentes: number | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationType: "MAIN" | "SUBSIDIARY";
  };
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  closedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  ventes: VenteDto[];
};

export type SessionCaisseCurrentDto = SessionCaisseDto & {
  live: SessionCaisseLiveDto;
};

export type ScanProductForSaleDto = {
  product: {
    id: string;
    name: string;
    qrCode: string;
    price: string | number;
    category: { id: string; name: string };
  };
  stock: {
    quantity: number;
    minQuantity: number;
    maxQuantity: number | null;
  } | null;
  availableQuantity: number;
  canSell: boolean;
};

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
  /** Présent après confirmation : lien avec la ligne STOCK du budget. */
  budgetLink: StockOrderBudgetLinkDto | null;
  product: ProductDto;
  supplier: SupplierDto;
  subsidiaryOrganization: {
    id: string;
    name: string;
    slug: string;
    organizationType: "MAIN" | "SUBSIDIARY";
  };
  requestedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
  } | null;
};

export type BudgetStatusDto =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export type BudgetLineNatureDto = "FIXED" | "VARIABLE";

export type BudgetLineCategoryDto =
  | "LOYER"
  | "SALAIRE"
  | "ELECTRICITE"
  | "EAU"
  | "INTERNET"
  | "ASSURANCE"
  | "STOCK"
  | "MAINTENANCE"
  | "MATERIEL"
  | "TRANSPORT"
  | "AUTRE";

export type BudgetUserSummaryDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type BudgetLineDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  budgetId: string;
  nature: BudgetLineNatureDto;
  category: BudgetLineCategoryDto;
  label: string;
  amountPlanned: string | number;
  spentFcfa?: number;
  remainingFcfa?: number;
};

export type PaginationMetaDto = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginatedBudgetsDto = {
  items: BudgetDto[];
  meta: PaginationMetaDto;
};

export type GroupAnalyticsOverviewDto = {
  year: number;
  scope: "MAIN" | "SUBSIDIARY";
  budget?: BudgetOverviewDto;
  hr?: {
    employeesActive: number;
    employeesTotal: number;
    leaveRequestsPending: number;
    bySubsidiary: Array<{
      organizationId: string;
      name: string;
      employeesActive: number;
      leavePending: number;
    }>;
  };
  stock?: {
    stockLines: number;
    lowStockLines: number;
    bySubsidiary: Array<{
      organizationId: string;
      name: string;
      stockLines: number;
      lowStockLines: number;
    }>;
  };
  stockOrders?: {
    pending: number;
    confirmed: number;
    cancelled: number;
    confirmedYearTotalFcfa: number;
    byStatus: Array<{ status: StockOrderStatusDto; count: number }>;
  };
  catalog?: {
    productsTotal: number;
    productsOfferedToSubsidiaries: number;
    subsidiariesCount: number;
  };
  spendingByMonth?: Array<{ month: number; spentFcfa: number }>;
  financial?: {
    revenueFcfa: number;
    expensesFcfa: number;
    netFcfa: number;
    revenueByMonth: Array<{ month: number; revenueFcfa: number }>;
    cashflowByMonth: Array<{
      month: number;
      revenueFcfa: number;
      spentFcfa: number;
    }>;
    bySubsidiary: Array<{
      organizationId: string;
      name: string;
      revenueFcfa: number;
      expensesFcfa: number;
      plannedFcfa: number;
      utilizationPercent: number;
      overBudget: boolean;
      atRisk: boolean;
    }>;
  };
  productRotation?: {
    topSellers: Array<{
      productId: string;
      productName: string;
      quantitySold: number;
      revenueFcfa: number;
    }>;
    slowMovers: Array<{
      productId: string;
      productName: string;
      stockQuantity: number;
      quantitySoldYear: number;
    }>;
  };
};

export type AccountingPeriodClosureDto = {
  id: string;
  year: number;
  month: number;
  closedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  closedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

export type NotificationDto = {
  id: string;
  createdAt: string;
  readAt: string | null;
  type: string;
  title: string;
  body: string;
  organizationId: string | null;
  metadata?: unknown;
};

export type MessagingContactDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
  organizationId: string;
  organization: { name: string; organizationType: string };
  role: {
    name: string;
    pole: { code: string; name: string } | null;
  };
};

export type MessageSenderDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
};

export type MessageDto = {
  id: string;
  threadId: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: MessageSenderDto;
};

export type MessageThreadSummaryDto = {
  id: string;
  scope: string;
  poleCode: string | null;
  updatedAt: string;
  participants: MessageSenderDto[];
  lastMessage: MessageDto | null;
  unread: boolean;
};

export type BudgetOverviewDto = {
  year: number;
  workflow: {
    budgetsPendingApproval: number;
    supplementsPendingFinance: number;
    supplementsPendingDirectors: number;
  };
  totals: {
    plannedFcfa: number;
    spentFcfa: number;
    utilizationPercent: number;
  };
  bySubsidiary: Array<{
    organizationId: string;
    name: string;
    slug: string;
    plannedFcfa: number;
    spentFcfa: number;
    approvedBudgets: number;
  }>;
  byCategory: Array<{
    category: BudgetLineCategoryDto;
    plannedFcfa: number;
    spentFcfa: number;
  }>;
  stockOrders: {
    pending: number;
    confirmedMonthTotalFcfa: number;
  };
};

export type BudgetDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  subsidiaryOrganizationId: string;
  year: number;
  month: number;
  status: BudgetStatusDto;
  financeNote: string | null;
  submittedAt: string | null;
  submittedBy: BudgetUserSummaryDto | null;
  approvedAt: string | null;
  approvedBy: BudgetUserSummaryDto | null;
  rejectedAt: string | null;
  rejectedBy: BudgetUserSummaryDto | null;
  rejectionReason: string | null;
  subsidiaryOrganization: {
    id: string;
    name: string;
    slug: string;
    organizationType: "MAIN" | "SUBSIDIARY";
  };
  lines: BudgetLineDto[];
};

export type BudgetSupplementStatusDto =
  | "PENDING_FINANCE"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export type BudgetSupplementRequestDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  budgetId: string;
  amountRequested: string | number;
  reason: string;
  status: BudgetSupplementStatusDto;
  financeNote: string | null;
  rejectionReason: string | null;
  requestedBy: BudgetUserSummaryDto;
  reviewedBy: BudgetUserSummaryDto | null;
  decidedBy: BudgetUserSummaryDto | null;
  budget: {
    id: string;
    year: number;
    month: number;
    status: BudgetStatusDto;
    subsidiaryOrganizationId: string;
    subsidiaryOrganization: { id: string; name: string; slug: string };
  };
};

/** GET `/budget/:budgetId/expenses` */
export type EmployeeStatusDto =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

export type LeaveStatusDto = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type LeaveTypeDto =
  | "PAID_LEAVE"
  | "RTT"
  | "SICK_LEAVE"
  | "UNPAID_LEAVE";

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
  type: LeaveTypeDto;
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
  /** Renseigné si la sortie provient d’une commande stock confirmée. */
  stockOrderId: string | null;
  budgetLine: {
    id: string;
    label: string;
    category: BudgetLineCategoryDto;
    nature: BudgetLineNatureDto;
    budgetId: string;
    budget?: {
      id: string;
      year: number;
      month: number;
      subsidiaryOrganizationId: string;
      subsidiaryOrganization: { id: string; name: string; slug: string };
    };
  };
  recordedBy: { id: string; email: string } | null;
};

export type HeritageAssetStatusDto =
  | "ACTIVE"
  | "MAINTENANCE"
  | "RETIRED";

export type HeritageAssetDto = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  value: string | null;
  status: HeritageAssetStatusDto;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type LegalContractStatusDto =
  | "DRAFT"
  | "ACTIVE"
  | "EXPIRED"
  | "TERMINATED";

export type LegalContractDto = {
  id: string;
  title: string;
  partyName: string;
  startDate: string | null;
  endDate: string | null;
  status: LegalContractStatusDto;
  notes: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductionOrderStatusDto =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ProductionOrderDto = {
  id: string;
  title: string;
  quantity: number;
  status: ProductionOrderStatusDto;
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string | null;
  organizationId: string;
  productId: string | null;
  product: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type StockTransferStatusDto =
  | "PENDING"
  | "SHIPPED"
  | "RECEIVED"
  | "CANCELLED";

export type StockTransferDto = {
  id: string;
  quantity: number;
  status: StockTransferStatusDto;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  shippedAt: string | null;
  receivedAt: string | null;
  fromOrganizationId: string;
  toOrganizationId: string;
  productId: string;
  product: { id: string; name: string; qrCode: string | null };
  fromOrganization: {
    id: string;
    name: string;
    slug: string;
    organizationType: string;
  };
  toOrganization: {
    id: string;
    name: string;
    slug: string;
    organizationType: string;
  };
  requestedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type StockMovementTypeDto =
  | "RECEIPT_STOCK_ORDER"
  | "SALE"
  | "SALE_RETURN"
  | "ADJUSTMENT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "INVENTORY";

export type StockMovementDto = {
  id: string;
  createdAt: string;
  quantityDelta: number;
  type: StockMovementTypeDto;
  referenceType: string | null;
  referenceId: string | null;
  label: string | null;
  organizationId: string;
  productId: string;
  product: { id: string; name: string; qrCode: string | null };
  organization: { id: string; name: string; slug: string };
};

export type TaskStatusDto = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriorityDto = "LOW" | "NORMAL" | "HIGH";
export type TaskScopeDto = "USER" | "POLE" | "ORGANIZATION";
export type ActionItemKindDto = "MANUAL" | "SYSTEM";

export type ActionUserSummaryDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
};

export type ActionItemDto = {
  id: string;
  kind: ActionItemKindDto;
  title: string;
  description?: string;
  status: TaskStatusDto;
  priority: TaskPriorityDto;
  scope?: TaskScopeDto;
  dueDate: string | null;
  href?: string;
  organizationId?: string;
  organizationName?: string;
  assigneeUserId?: string | null;
  /** Responsable affiché : assigné ou créateur si non assigné. */
  assignee?: ActionUserSummaryDto | null;
  createdByUserId?: string;
  createdAt: string;
  completedAt: string | null;
  editable: boolean;
};

export type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusDto;
  priority: TaskPriorityDto;
  scope: TaskScopeDto;
  dueDate: string | null;
  completedAt: string | null;
  organizationId: string;
  assigneeUserId: string | null;
  createdByUserId: string;
  poleCode: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { name: string };
  assignee: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profilePhotoUrl: string | null;
  } | null;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profilePhotoUrl: string | null;
  };
};
