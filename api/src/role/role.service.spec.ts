import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { mockPrismaServiceProvider } from '../test/mocks/prisma-service.mock';

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        mockPrismaServiceProvider({
          role: {
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: jest.fn(),
            create: jest.fn(),
          },
        }),
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
