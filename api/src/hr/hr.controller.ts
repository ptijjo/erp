import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { DepartmentService } from './department.service';
import { EmployeeService } from './employee.service';
import { LeaveRequestService } from './leave-request.service';
import { LeaveBalanceService } from './leave-balance.service';
import { EmploymentContractService } from './employment-contract.service';
import { EmployeeSalaryService } from './employee-salary.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import {
  CreateLeaveRequestDto,
  UpdateLeaveRequestStatusDto,
} from './dto/leave-request.dto';
import {
  CreateLeaveBalanceDto,
  UpdateLeaveBalanceDto,
} from './dto/leave-balance.dto';
import {
  CreateEmploymentContractDto,
  UpdateEmploymentContractDto,
} from './dto/employment-contract.dto';
import {
  CreateEmployeeSalaryDto,
  UpdateEmployeeSalaryDto,
} from './dto/employee-salary.dto';
import { HrEmployeeScopedListQueryDto, HrListQueryDto } from './dto/hr-list-query.dto';
import { EnsureLeaveBalanceDto } from './dto/ensure-leave-balance.dto';
import { PaginationQueryDto } from '../lib/pagination-query.dto';

@Controller('hr')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class HrController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly employeeService: EmployeeService,
    private readonly leaveRequestService: LeaveRequestService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly employmentContractService: EmploymentContractService,
    private readonly employeeSalaryService: EmployeeSalaryService,
  ) {}

  @Get('departments')
  @CheckPolicies({ action: 'read', subject: 'Department' })
  findAllDepartments(
    @Query() query: PaginationQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.departmentService.findAll(viewer, query);
  }

  @Get('departments/:id')
  @CheckPolicies({ action: 'read', subject: 'Department' })
  findOneDepartment(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.departmentService.findOne(id, viewer);
  }

  @Post('departments')
  @CheckPolicies({ action: 'create', subject: 'Department' })
  createDepartment(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.departmentService.create(dto, viewer);
  }

  @Patch('departments/:id')
  @CheckPolicies({ action: 'update', subject: 'Department' })
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.departmentService.update(id, dto, viewer);
  }

  @Delete('departments/:id')
  @CheckPolicies({ action: 'delete', subject: 'Department' })
  removeDepartment(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.departmentService.remove(id, viewer);
  }

  @Get('employees')
  @CheckPolicies({ action: 'read', subject: 'Employee' })
  findAllEmployees(
    @Query() query: HrListQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeService.findAll(viewer, query);
  }

  @Get('employees/:id')
  @CheckPolicies({ action: 'read', subject: 'Employee' })
  findOneEmployee(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeService.findOne(id, viewer);
  }

  @Post('employees')
  @CheckPolicies({ action: 'create', subject: 'Employee' })
  createEmployee(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeService.create(dto, viewer);
  }

  @Patch('employees/:id')
  @CheckPolicies({ action: 'update', subject: 'Employee' })
  updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeService.update(id, dto, viewer);
  }

  @Delete('employees/:id')
  @CheckPolicies({ action: 'delete', subject: 'Employee' })
  removeEmployee(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeService.remove(id, viewer);
  }

  @Get('leave-requests')
  @CheckPolicies({ action: 'read', subject: 'LeaveRequest' })
  findAllLeaveRequests(
    @Query() query: PaginationQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveRequestService.findAll(viewer, query);
  }

  @Get('leave-requests/:id')
  @CheckPolicies({ action: 'read', subject: 'LeaveRequest' })
  findOneLeaveRequest(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveRequestService.findOne(id, viewer);
  }

  @Post('leave-requests')
  @CheckPolicies({ action: 'create', subject: 'LeaveRequest' })
  createLeaveRequest(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveRequestService.create(dto, viewer);
  }

  @Patch('leave-requests/:id/status')
  @CheckPolicies({ action: 'update', subject: 'LeaveRequest' })
  updateLeaveRequestStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveRequestStatusDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveRequestService.updateStatus(id, dto, viewer);
  }

  @Delete('leave-requests/:id')
  @CheckPolicies({ action: 'delete', subject: 'LeaveRequest' })
  removeLeaveRequest(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveRequestService.remove(id, viewer);
  }

  @Get('leave-balances')
  @CheckPolicies({ action: 'read', subject: 'LeaveBalance' })
  findAllLeaveBalances(
    @Query() query: HrEmployeeScopedListQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveBalanceService.findAll(viewer, query);
  }

  @Post('leave-balances/renew-exercise')
  @CheckPolicies({ action: 'manage', subject: 'LeaveBalance' })
  renewLeaveExercise(@CurrentUser() viewer: AuthenticatedUser) {
    return this.leaveBalanceService.renewExerciseForAll(viewer);
  }

  @Post('leave-balances/ensure')
  @CheckPolicies({ action: 'create', subject: 'LeaveBalance' })
  ensureLeaveBalance(
    @Body() dto: EnsureLeaveBalanceDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveBalanceService.ensureForEmployee(
      dto.employeeId,
      viewer,
      dto.referenceDate,
    );
  }

  @Get('leave-balances/:id')
  @CheckPolicies({ action: 'read', subject: 'LeaveBalance' })
  findOneLeaveBalance(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveBalanceService.findOne(id, viewer);
  }

  @Post('leave-balances')
  @CheckPolicies({ action: 'create', subject: 'LeaveBalance' })
  createLeaveBalance(
    @Body() dto: CreateLeaveBalanceDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveBalanceService.create(dto, viewer);
  }

  @Patch('leave-balances/:id')
  @CheckPolicies({ action: 'update', subject: 'LeaveBalance' })
  updateLeaveBalance(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveBalanceDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveBalanceService.update(id, dto, viewer);
  }

  @Delete('leave-balances/:id')
  @CheckPolicies({ action: 'delete', subject: 'LeaveBalance' })
  removeLeaveBalance(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.leaveBalanceService.remove(id, viewer);
  }

  @Get('contracts')
  @CheckPolicies({ action: 'read', subject: 'EmploymentContract' })
  findAllContracts(
    @Query() query: HrEmployeeScopedListQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employmentContractService.findAll(viewer, query);
  }

  @Get('contracts/:id')
  @CheckPolicies({ action: 'read', subject: 'EmploymentContract' })
  findOneContract(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employmentContractService.findOne(id, viewer);
  }

  @Post('contracts')
  @CheckPolicies({ action: 'create', subject: 'EmploymentContract' })
  createContract(
    @Body() dto: CreateEmploymentContractDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employmentContractService.create(dto, viewer);
  }

  @Patch('contracts/:id')
  @CheckPolicies({ action: 'update', subject: 'EmploymentContract' })
  updateContract(
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentContractDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employmentContractService.update(id, dto, viewer);
  }

  @Delete('contracts/:id')
  @CheckPolicies({ action: 'delete', subject: 'EmploymentContract' })
  removeContract(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employmentContractService.remove(id, viewer);
  }

  @Get('salaries')
  @CheckPolicies({ action: 'read', subject: 'EmployeeSalary' })
  findAllSalaries(
    @Query() query: HrEmployeeScopedListQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSalaryService.findAll(viewer, query);
  }

  @Get('salaries/:id')
  @CheckPolicies({ action: 'read', subject: 'EmployeeSalary' })
  findOneSalary(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSalaryService.findOne(id, viewer);
  }

  @Post('salaries')
  @CheckPolicies({ action: 'create', subject: 'EmployeeSalary' })
  createSalary(
    @Body() dto: CreateEmployeeSalaryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSalaryService.create(dto, viewer);
  }

  @Patch('salaries/:id')
  @CheckPolicies({ action: 'update', subject: 'EmployeeSalary' })
  updateSalary(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeSalaryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSalaryService.update(id, dto, viewer);
  }

  @Delete('salaries/:id')
  @CheckPolicies({ action: 'delete', subject: 'EmployeeSalary' })
  removeSalary(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSalaryService.remove(id, viewer);
  }
}
