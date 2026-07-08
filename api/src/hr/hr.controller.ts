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
import { WorkShiftService } from './work-shift.service';
import { RecurringWorkShiftService } from './recurring-work-shift.service';
import { EmployeeSanctionService } from './employee-sanction.service';
import { EmployeeDepartureService } from './employee-departure.service';
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
import {
  CreateWorkShiftDto,
  UpdateWorkShiftDto,
  WorkShiftCalendarQueryDto,
} from './dto/work-shift.dto';
import {
  CreateEmployeeSanctionDto,
  UpdateEmployeeSanctionDto,
} from './dto/employee-sanction.dto';
import {
  CreateEmployeeDepartureDto,
  UpdateEmployeeDepartureDto,
} from './dto/employee-departure.dto';
import {
  CreateRecurringWorkShiftDto,
  GenerateWeekDto,
  UpdateRecurringWorkShiftDto,
} from './dto/recurring-work-shift.dto';
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
    private readonly workShiftService: WorkShiftService,
    private readonly recurringWorkShiftService: RecurringWorkShiftService,
    private readonly employeeSanctionService: EmployeeSanctionService,
    private readonly employeeDepartureService: EmployeeDepartureService,
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

  @Get('work-shifts')
  @CheckPolicies({ action: 'read', subject: 'WorkShift' })
  findAllWorkShifts(
    @Query() query: HrEmployeeScopedListQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.workShiftService.findAll(viewer, query);
  }

  @Get('work-shifts/calendar')
  @CheckPolicies({ action: 'read', subject: 'WorkShift' })
  findWorkShiftsCalendar(
    @Query() query: WorkShiftCalendarQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.workShiftService.findCalendar(viewer, query);
  }

  @Get('work-shifts/:id')
  @CheckPolicies({ action: 'read', subject: 'WorkShift' })
  findOneWorkShift(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.workShiftService.findOne(id, viewer);
  }

  @Post('work-shifts')
  @CheckPolicies({ action: 'create', subject: 'WorkShift' })
  createWorkShift(
    @Body() dto: CreateWorkShiftDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.workShiftService.create(dto, viewer);
  }

  @Patch('work-shifts/:id')
  @CheckPolicies({ action: 'update', subject: 'WorkShift' })
  updateWorkShift(
    @Param('id') id: string,
    @Body() dto: UpdateWorkShiftDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.workShiftService.update(id, dto, viewer);
  }

  @Delete('work-shifts/:id')
  @CheckPolicies({ action: 'delete', subject: 'WorkShift' })
  removeWorkShift(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.workShiftService.remove(id, viewer);
  }

  @Post('work-shifts/generate')
  @CheckPolicies({ action: 'create', subject: 'WorkShift' })
  generateWorkShiftsWeek(
    @Body() dto: GenerateWeekDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.workShiftService.generateWeek(viewer, dto);
  }

  @Get('recurring-work-shifts')
  @CheckPolicies({ action: 'read', subject: 'WorkShift' })
  findAllRecurringWorkShifts(
    @Query() query: HrEmployeeScopedListQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.recurringWorkShiftService.findAll(viewer, query);
  }

  @Get('recurring-work-shifts/:id')
  @CheckPolicies({ action: 'read', subject: 'WorkShift' })
  findOneRecurringWorkShift(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.recurringWorkShiftService.findOne(id, viewer);
  }

  @Post('recurring-work-shifts')
  @CheckPolicies({ action: 'create', subject: 'WorkShift' })
  createRecurringWorkShift(
    @Body() dto: CreateRecurringWorkShiftDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.recurringWorkShiftService.create(dto, viewer);
  }

  @Patch('recurring-work-shifts/:id')
  @CheckPolicies({ action: 'update', subject: 'WorkShift' })
  updateRecurringWorkShift(
    @Param('id') id: string,
    @Body() dto: UpdateRecurringWorkShiftDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.recurringWorkShiftService.update(id, dto, viewer);
  }

  @Delete('recurring-work-shifts/:id')
  @CheckPolicies({ action: 'delete', subject: 'WorkShift' })
  removeRecurringWorkShift(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.recurringWorkShiftService.remove(id, viewer);
  }

  @Get('sanctions')
  @CheckPolicies({ action: 'read', subject: 'EmployeeSanction' })
  findAllSanctions(
    @Query() query: HrEmployeeScopedListQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSanctionService.findAll(viewer, query);
  }

  @Get('sanctions/:id')
  @CheckPolicies({ action: 'read', subject: 'EmployeeSanction' })
  findOneSanction(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSanctionService.findOne(id, viewer);
  }

  @Post('sanctions')
  @CheckPolicies({ action: 'create', subject: 'EmployeeSanction' })
  createSanction(
    @Body() dto: CreateEmployeeSanctionDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSanctionService.create(dto, viewer);
  }

  @Patch('sanctions/:id')
  @CheckPolicies({ action: 'update', subject: 'EmployeeSanction' })
  updateSanction(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeSanctionDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSanctionService.update(id, dto, viewer);
  }

  @Delete('sanctions/:id')
  @CheckPolicies({ action: 'delete', subject: 'EmployeeSanction' })
  removeSanction(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeSanctionService.remove(id, viewer);
  }

  @Get('departures')
  @CheckPolicies({ action: 'read', subject: 'EmployeeDeparture' })
  findAllDepartures(
    @Query() query: HrEmployeeScopedListQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeDepartureService.findAll(viewer, query);
  }

  @Get('departures/:id')
  @CheckPolicies({ action: 'read', subject: 'EmployeeDeparture' })
  findOneDeparture(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeDepartureService.findOne(id, viewer);
  }

  @Post('departures')
  @CheckPolicies({ action: 'create', subject: 'EmployeeDeparture' })
  createDeparture(
    @Body() dto: CreateEmployeeDepartureDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeDepartureService.create(dto, viewer);
  }

  @Patch('departures/:id')
  @CheckPolicies({ action: 'update', subject: 'EmployeeDeparture' })
  updateDeparture(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDepartureDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeDepartureService.update(id, dto, viewer);
  }

  @Delete('departures/:id')
  @CheckPolicies({ action: 'delete', subject: 'EmployeeDeparture' })
  removeDeparture(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.employeeDepartureService.remove(id, viewer);
  }
}
