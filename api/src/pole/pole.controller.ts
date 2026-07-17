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
import { CreatePoleDto } from './dto/create-pole.dto';
import { UpdatePoleDto } from './dto/update-pole.dto';
import { PoleService } from './pole.service';

@Controller('poles')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PoleController {
  constructor(private readonly poleService: PoleService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Pole' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.poleService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Pole' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.poleService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Pole' })
  create(
    @Body() dto: CreatePoleDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.poleService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Pole' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePoleDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.poleService.update(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Pole' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.poleService.remove(id, viewer);
  }
}
