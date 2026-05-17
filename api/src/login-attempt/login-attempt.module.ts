import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LoginAttemptService } from './login-attempt.service';
import { LoginAttemptController } from './login-attempt.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LoginAttemptController],
  providers: [LoginAttemptService],
  exports: [LoginAttemptService],
})
export class LoginAttemptModule {}
