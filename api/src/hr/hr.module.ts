import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HrController } from './hr.controller';
import { DepartmentService } from './department.service';
import { EmployeeService } from './employee.service';
import { LeaveRequestService } from './leave-request.service';
import { LeaveBalanceService } from './leave-balance.service';
import { EmploymentContractService } from './employment-contract.service';
import { EmployeeSalaryService } from './employee-salary.service';
import { WorkShiftService } from './work-shift.service';
import { RecurringWorkShiftService } from './recurring-work-shift.service';
import { EmployeeSanctionService } from './employee-sanction.service';
import { EmployeeDepartureService } from './employee-departure.service';

@Module({
  imports: [PrismaModule],
  controllers: [HrController],
  providers: [
    DepartmentService,
    EmployeeService,
    LeaveRequestService,
    LeaveBalanceService,
    EmploymentContractService,
    EmployeeSalaryService,
    WorkShiftService,
    RecurringWorkShiftService,
    EmployeeSanctionService,
    EmployeeDepartureService,
  ],
  exports: [
    DepartmentService,
    EmployeeService,
    LeaveRequestService,
    LeaveBalanceService,
    EmploymentContractService,
    EmployeeSalaryService,
    WorkShiftService,
    RecurringWorkShiftService,
    EmployeeSanctionService,
    EmployeeDepartureService,
  ],
})
export class HrModule {}
