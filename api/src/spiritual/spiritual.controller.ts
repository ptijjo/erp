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
import { CreateSpiritualEventDto, UpdateSpiritualEventDto } from './dto/spiritual.dto';
import { SpiritualService } from './spiritual.service';

@Controller('spiritual/events')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SpiritualController {
  constructor(private readonly spiritualService: SpiritualService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'SpiritualEvent' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.spiritualService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'SpiritualEvent' })
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.spiritualService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'SpiritualEvent' })
  create(@Body() dto: CreateSpiritualEventDto, @CurrentUser() viewer: AuthenticatedUser) {
    return this.spiritualService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'SpiritualEvent' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpiritualEventDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.spiritualService.update(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'SpiritualEvent' })
  remove(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.spiritualService.remove(id, viewer);
  }
}
