import type {
  EmployeeDepartureReasonDto,
  EmployeeSanctionTypeDto,
  EmployeeStatusDto,
  EmploymentContractStatusDto,
  EmploymentContractTypeDto,
  LeaveStatusDto,
  LeaveTypeDto,
  WeekDayDto,
  WorkShiftKindDto,
  WorkShiftStatusDto,
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

export const WORK_SHIFT_STATUS_LABEL: Record<WorkShiftStatusDto, string> = {
  PLANNED: "Planifié",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
};

export const WORK_SHIFT_STATUS_OPTIONS = Object.entries(
  WORK_SHIFT_STATUS_LABEL,
) as [WorkShiftStatusDto, string][];

export const WORK_SHIFT_KIND_LABEL: Record<WorkShiftKindDto, string> = {
  WORK: "Travail",
  BREAK: "Pause",
};

export const WORK_SHIFT_KIND_OPTIONS = Object.entries(
  WORK_SHIFT_KIND_LABEL,
) as [WorkShiftKindDto, string][];

export const WEEK_DAY_LABEL: Record<WeekDayDto, string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

/** Ordre lundi → dimanche (aligné sur la génération API). */
export const WEEK_DAY_OPTIONS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
].map((d) => [d, WEEK_DAY_LABEL[d as WeekDayDto]]) as [WeekDayDto, string][];

export const SANCTION_TYPE_LABEL: Record<EmployeeSanctionTypeDto, string> = {
  WARNING: "Avertissement",
  SUSPENSION: "Mise à pied",
  LAYOFF: "Licenciement",
};

export const SANCTION_TYPE_OPTIONS = Object.entries(SANCTION_TYPE_LABEL) as [
  EmployeeSanctionTypeDto,
  string,
][];

export const DEPARTURE_REASON_LABEL: Record<EmployeeDepartureReasonDto, string> =
  {
    RESIGNATION: "Démission",
    DISMISSAL: "Licenciement",
    END_OF_CONTRACT: "Fin de contrat",
    RETIREMENT: "Retraite",
    ABANDONMENT: "Abandon de poste",
    OTHER: "Autre",
  };

export const DEPARTURE_REASON_OPTIONS = Object.entries(
  DEPARTURE_REASON_LABEL,
) as [EmployeeDepartureReasonDto, string][];

/** Règles métier congés (alignées API `leave-balance.rules.ts`). */
export const LEAVE_POLICY_SUMMARY =
  "30 jours de congés par an, exercice du 1er mai au 30 avril, renouvellement en mai. Les jours non pris se cumulent sur l'exercice suivant.";

export const LEAVE_ANNUAL_DAYS = 30;
