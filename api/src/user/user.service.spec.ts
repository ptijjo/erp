import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { mockPrismaServiceProvider } from '../test/mocks/prisma-service.mock';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        mockPrismaServiceProvider({
          user: {
            findMany: jest.fn().mockResolvedValue([]),
          },
        }),
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
