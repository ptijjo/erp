import { Module } from '@nestjs/common';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { UserService } from '../../src/user/user.service';
import { ImageProcessorService } from '../../src/storage/image-processor.service';
import { R2ObjectStorageService } from '../../src/storage/r2-object-storage.service';
import { CaslAbilityFactory } from '../../src/casl/casl-ability.factory';
import { EmployeeService } from '../../src/hr/employee.service';
import { AppCacheService } from '../../src/cache/app-cache.service';
import { mockAppCacheServiceProvider } from '../../src/test/mocks/app-cache.mock';

/** UserModule sans contrôleur : tests d'intégration auth uniquement. */
@Module({
  imports: [PrismaModule],
  providers: [
    UserService,
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
      useValue: {
        createForUser: jest.fn(),
        invalidateRole: jest.fn(),
      },
    },
    {
      provide: EmployeeService,
      useValue: { provisionForNewUser: jest.fn() },
    },
    mockAppCacheServiceProvider,
  ],
  exports: [UserService],
})
export class UserModuleAuthE2e {}
