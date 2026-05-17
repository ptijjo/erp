import { Module } from '@nestjs/common';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { UserService } from '../../src/user/user.service';

/** UserModule sans contrôleur : tests d'intégration auth uniquement. */
@Module({
  imports: [PrismaModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModuleAuthE2e {}
