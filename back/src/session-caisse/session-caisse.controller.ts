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
import type { Prisma } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CreateSessionCaisseDto,
  UpdateSessionCaisseDto,
} from './dto/session-caisse.dto';
import { SessionCaisseService } from './session-caisse.service';

@Controller('session-caisse')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SessionCaisseController {
  constructor(private readonly sessionCaisseService: SessionCaisseService) {}

  @Get('open/:organizationId')
  @CheckPolicies({ action: 'read', subject: 'SessionCaisse' })
  findOpen(@Param('organizationId') organizationId: string) {
    return this.sessionCaisseService.findOpenByOrganization(organizationId);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'SessionCaisse' })
  findAll() {
    return this.sessionCaisseService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'SessionCaisse' })
  findOne(@Param('id') id: string) {
    return this.sessionCaisseService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'SessionCaisse' })
  create(@Body() dto: CreateSessionCaisseDto) {
    const data: Prisma.SessionCaisseCreateInput = {
      organization: { connect: { id: dto.organizationId } },
      user: { connect: { id: dto.userId } },
      fondOuverture: dto.fondOuverture,
      ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
    };
    return this.sessionCaisseService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'SessionCaisse' })
  update(@Param('id') id: string, @Body() dto: UpdateSessionCaisseDto) {
    const data: Prisma.SessionCaisseUpdateInput = {
      ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
      ...(dto.closedAt !== undefined
        ? { closedAt: dto.closedAt ? new Date(dto.closedAt) : null }
        : {}),
      ...(dto.fondCloture !== undefined ? { fondCloture: dto.fondCloture } : {}),
      ...(dto.commentaireCloture !== undefined
        ? { commentaireCloture: dto.commentaireCloture }
        : {}),
    };
    if (dto.closedByUserId !== undefined) {
      data.closedByUser =
        dto.closedByUserId === null
          ? { disconnect: true }
          : { connect: { id: dto.closedByUserId } };
    }
    return this.sessionCaisseService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'SessionCaisse' })
  remove(@Param('id') id: string) {
    return this.sessionCaisseService.remove(id);
  }
}
