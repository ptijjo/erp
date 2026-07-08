import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { DirectoryService } from './directory.service';
import { DirectorySearchQueryDto } from './dto/directory-query.dto';

@Controller('directory')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('search')
  @CheckPolicies({ action: 'read', subject: 'User' })
  search(
    @Query() query: DirectorySearchQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.directoryService.search(
      viewer,
      query.q,
      query.limit ?? 20,
    );
  }
}
