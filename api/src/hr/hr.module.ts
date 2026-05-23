import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HrController } from './hr.controller';
import { DepartmentService } from './department.service';
import { EmployeeService } from './employee.service';
import { LeaveRequestService } from './leave-request.service';
import { LeaveBalanceService } from './leave-balance.service';
import { EmploymentContractService } from './employment-contract.service';
import { EmployeeSalaryService } from './employee-salary.service';

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
  ],
  exports: [
    DepartmentService,
    EmployeeService,
    LeaveRequestService,
    LeaveBalanceService,
    EmploymentContractService,
    EmployeeSalaryService,
  ],
})
export class HrModule {}
