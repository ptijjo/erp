import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { OrganisationService } from './organisation.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization';
import { SetOrganizationCatalogDto } from './dto/set-organization-catalog.dto';

@Controller('organisation')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class OrganisationController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Organization' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.organisationService.getAllOrganisations(viewer);
  }

  @Get(':id/catalog')
  @CheckPolicies({ action: 'read', subject: 'Organization' })
  getCatalog(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.organisationService.getOrganizationCatalog(id, viewer);
  }

  @Put(':id/catalog')
  @CheckPolicies({ action: 'update', subject: 'Organization' })
  setCatalog(
    @Param('id') id: string,
    @Body() dto: SetOrganizationCatalogDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.organisationService.setOrganizationCatalog(id, dto, viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Organization' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.organisationService.getOrganisationById(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Organization' })
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.organisationService.createOrganisation(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Organization' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.organisationService.updateOrganisation(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Organization' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.organisationService.deleteOrganisation(id, viewer);
  }

  @Post(':id/users/:userId')
  @CheckPolicies({ action: 'update', subject: 'Organization' })
  addUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.organisationService.addUserToOrganisation(id, userId, viewer);
  }

  @Delete(':id/users/:userId')
  @CheckPolicies({ action: 'update', subject: 'Organization' })
  removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.organisationService.removeUserFromOrganisation(
      id,
      userId,
      viewer,
    );
  }
}
