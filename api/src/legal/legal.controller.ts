import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { CreateLegalContractDto, UpdateLegalContractDto } from './dto/legal.dto';
import { LegalService } from './legal.service';

@Controller('legal/contracts')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'LegalContract' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.legalService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'LegalContract' })
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.legalService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'LegalContract' })
  create(@Body() dto: CreateLegalContractDto, @CurrentUser() viewer: AuthenticatedUser) {
    return this.legalService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'LegalContract' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLegalContractDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.legalService.update(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'LegalContract' })
  remove(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.legalService.remove(id, viewer);
  }
}
