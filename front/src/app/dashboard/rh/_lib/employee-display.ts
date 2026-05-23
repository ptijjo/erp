import type { HrEmployeeSummaryDto } from "~/lib/api-types";

type EmployeeNameFields = Pick<
  HrEmployeeSummaryDto,
  "firstName" | "lastName"
>;

export function employeeDisplayName(employee: EmployeeNameFields): string {
  return `${employee.firstName.trim()} ${employee.lastName.trim()}`.trim();
}
