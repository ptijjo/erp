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
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { OrganisationService } from './organisation.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization';

@Controller('organisation')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class OrganisationController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Organization' })
  findAll() {
    return this.organisationService.getAllOrganisations();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Organization' })
  findOne(@Param('id') id: string) {
    return this.organisationService.getOrganisationById(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Organization' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organisationService.createOrganisation(dto);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Organization' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organisationService.updateOrganisation(id, dto);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Organization' })
  remove(@Param('id') id: string) {
    return this.organisationService.deleteOrganisation(id);
  }

  @Post(':id/users/:userId')
  @CheckPolicies({ action: 'update', subject: 'Organization' })
  addUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.organisationService.addUserToOrganisation(id, userId);
  }

  @Delete(':id/users/:userId')
  @CheckPolicies({ action: 'update', subject: 'Organization' })
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.organisationService.removeUserFromOrganisation(id, userId);
  }
}
