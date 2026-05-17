import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { FullAccessRoleGuard } from '../casl/full-access-role.guard';
import { allowAllGuard } from '../test/mocks/guards.mock';

describe('RoleController', () => {
  let controller: RoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: {
            getAllRoles: jest.fn(),
            getRoleById: jest.fn(),
            createRole: jest.fn(),
            updateRole: jest.fn(),
            deleteRole: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(PoliciesGuard)
      .useValue(allowAllGuard)
      .overrideGuard(FullAccessRoleGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
