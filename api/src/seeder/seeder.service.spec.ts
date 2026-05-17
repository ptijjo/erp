import { Test, TestingModule } from '@nestjs/testing';
import { SeederService } from './seeder.service';
import { mockPrismaServiceProvider } from '../test/mocks/prisma-service.mock';
import { mockConfigServiceProvider } from '../test/mocks/config-service.mock';

describe('SeederService', () => {
  let service: SeederService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        mockPrismaServiceProvider({
          organization: { findFirst: jest.fn(), create: jest.fn() },
          pole: { upsert: jest.fn() },
          role: { upsert: jest.fn(), findUnique: jest.fn() },
          permission: { upsert: jest.fn() },
          user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
        }),
        mockConfigServiceProvider({
          SEED_ORGANIZATION_NAME: 'VIFAA',
          SEED_ADMIN_EMAIL: 'admin@test.local',
          SEED_ADMIN_PASSWORD: 'secret',
          SEED_ADMIN_ROLE: 'ADMIN',
          PASSWORD_ROUNDS: '4',
        }),
      ],
    }).compile();

    service = module.get<SeederService>(SeederService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
