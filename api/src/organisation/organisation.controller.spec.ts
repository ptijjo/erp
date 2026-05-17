import { Test, TestingModule } from '@nestjs/testing';
import { OrganisationController } from './organisation.controller';
import { OrganisationService } from './organisation.service';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { allowAllGuard } from '../test/mocks/guards.mock';

describe('OrganisationController', () => {
  let controller: OrganisationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganisationController],
      providers: [
        {
          provide: OrganisationService,
          useValue: {
            getAllOrganisations: jest.fn(),
            getOrganisationById: jest.fn(),
            createOrganisation: jest.fn(),
            updateOrganisation: jest.fn(),
            deleteOrganisation: jest.fn(),
            setOrganizationCatalog: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(PoliciesGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<OrganisationController>(OrganisationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
