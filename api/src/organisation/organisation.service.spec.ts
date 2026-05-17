import { Test, TestingModule } from '@nestjs/testing';
import { OrganisationService } from './organisation.service';
import { mockPrismaServiceProvider } from '../test/mocks/prisma-service.mock';

describe('OrganisationService', () => {
  let service: OrganisationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganisationService,
        mockPrismaServiceProvider({
          organization: {
            findMany: jest.fn().mockResolvedValue([]),
          },
        }),
      ],
    }).compile();

    service = module.get<OrganisationService>(OrganisationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
