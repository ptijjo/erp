import { Test, TestingModule } from '@nestjs/testing';
import { HrController } from './hr.controller';
import { DepartmentService } from './department.service';
import { EmployeeService } from './employee.service';
import { LeaveRequestService } from './leave-request.service';
import { LeaveBalanceService } from './leave-balance.service';
import { EmploymentContractService } from './employment-contract.service';
import { EmployeeSalaryService } from './employee-salary.service';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { allowAllGuard } from '../test/mocks/guards.mock';
import type { AuthenticatedUser } from '../auth/auth.types';

const viewer: AuthenticatedUser = {
  sub: 'u-hr',
  email: 'drh@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r-hr',
    name: 'DIRECTOR_HR',
    description: null,
    poleCode: 'Pole_HR',
  },
};

describe('HrController', () => {
  let controller: HrController;
  let departmentService: { findAll: jest.Mock; create: jest.Mock };
  let employeeService: { findAll: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    departmentService = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'dep-1' }),
    };
    employeeService = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'emp-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HrController],
      providers: [
        { provide: DepartmentService, useValue: departmentService },
        {
          provide: EmployeeService,
          useValue: {
            ...employeeService,
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: LeaveRequestService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            updateStatus: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: LeaveBalanceService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: EmploymentContractService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: EmployeeSalaryService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(PoliciesGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get(HrController);
  });

  it('délègue findAllDepartments au service', async () => {
    await controller.findAllDepartments({ page: 1, limit: 20 }, viewer);
    expect(departmentService.findAll).toHaveBeenCalledWith(viewer, {
      page: 1,
      limit: 20,
    });
  });

  it('délègue createEmployee au service', async () => {
    const dto = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      hireDate: new Date('2024-01-01'),
      organizationId: 'org-sub',
    };
    await controller.createEmployee(dto, viewer);
    expect(employeeService.create).toHaveBeenCalledWith(dto, viewer);
  });
});
