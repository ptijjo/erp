import type {
  EmployeeStatusDto,
  EmploymentContractStatusDto,
  EmploymentContractTypeDto,
  LeaveStatusDto,
  LeaveTypeDto,
} from "~/lib/api-types";

export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatusDto, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  SUSPENDED: "Suspendu",
  TERMINATED: "Sorti",
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatusDto, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
  CANCELLED: "Annulé",
};

export const LEAVE_TYPE_LABEL: Record<LeaveTypeDto, string> = {
  PAID_LEAVE: "Congés payés",
  RTT: "RTT",
  SICK_LEAVE: "Maladie",
  UNPAID_LEAVE: "Sans solde",
};

export const LEAVE_TYPE_OPTIONS = Object.entries(LEAVE_TYPE_LABEL) as [
  LeaveTypeDto,
  string,
][];

export const CONTRACT_TYPE_LABEL: Record<EmploymentContractTypeDto, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  INTERIM: "Intérim",
  OTHER: "Autre",
};

export const CONTRACT_STATUS_LABEL: Record<
  EmploymentContractStatusDto,
  string
> = {
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  TERMINATED: "Rompu",
};

export const EMPLOYEE_STATUS_OPTIONS = Object.entries(
  EMPLOYEE_STATUS_LABEL,
) as [EmployeeStatusDto, string][];

export const CONTRACT_TYPE_OPTIONS = Object.entries(
  CONTRACT_TYPE_LABEL,
) as [EmploymentContractTypeDto, string][];

export const CONTRACT_STATUS_OPTIONS = Object.entries(
  CONTRACT_STATUS_LABEL,
) as [EmploymentContractStatusDto, string][];

/** Règles métier congés (alignées API `leave-balance.rules.ts`). */
export const LEAVE_POLICY_SUMMARY =
  "30 jours de congés par an, exercice du 1er mai au 30 avril, renouvellement en mai. Les jours non pris se cumulent sur l'exercice suivant.";

export const LEAVE_ANNUAL_DAYS = 30;
