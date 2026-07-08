import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { mockPrismaServiceProvider } from '../test/mocks/prisma-service.mock';
import { ImageProcessorService } from '../storage/image-processor.service';
import { R2ObjectStorageService } from '../storage/r2-object-storage.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { EmployeeService } from '../hr/employee.service';

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
        {
          provide: ImageProcessorService,
          useValue: { processProfileAvatar: jest.fn() },
        },
        {
          provide: R2ObjectStorageService,
          useValue: {
            buildProfilePhotoKey: jest.fn(),
            uploadProfilePhoto: jest.fn(),
            deleteByPublicUrl: jest.fn(),
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: { createForUser: jest.fn() },
        },
        {
          provide: EmployeeService,
          useValue: { provisionForNewUser: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
