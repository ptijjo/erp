import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { AdminRoleGuard } from '../casl/admin-role.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { FullAccessRoleGuard } from '../casl/full-access-role.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { PermissionService } from './permission.service';
import { PermissionRoleService } from './permission-role.service';
import {
  CreatePermissionDto,
  LinkPermissionRoleDto,
  UpdatePermissionDto,
} from './dto/permission.dto';

@Controller('permission')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly permissionRoleService: PermissionRoleService,
  ) {}

  @Get('by-role/:roleId')
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findByRole(
    @Param('roleId') roleId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.permissionRoleService.findByRoleId(roleId, viewer);
  }

  @Get('by-permission/:permissionId')
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findByPermission(
    @Param('permissionId') permissionId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.permissionRoleService.findByPermissionId(permissionId, viewer);
  }

  /**
   * Liste complète pour les écrans d’assignation rôle ↔ permission (pas le catalogue admin).
   */
  @Get('for-assignment')
  @CheckPolicies({ action: 'update', subject: 'Permission' })
  findAllForAssignment() {
    return this.permissionService.findAll();
  }

  @Get()
  @UseGuards(AdminRoleGuard)
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findAll() {
    return this.permissionService.findAll();
  }

  @Get(':id')
  @UseGuards(AdminRoleGuard)
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id);
  }

  @Post()
  @UseGuards(AdminRoleGuard)
  @CheckPolicies({ action: 'create', subject: 'Permission' })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Post('link')
  @UseGuards(FullAccessRoleGuard)
  @CheckPolicies({ action: 'update', subject: 'Permission' })
  link(
    @Body() dto: LinkPermissionRoleDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.permissionRoleService.link(
      dto.permissionId,
      dto.roleId,
      viewer,
    );
  }

  @Delete('link')
  @UseGuards(FullAccessRoleGuard)
  @CheckPolicies({ action: 'update', subject: 'Permission' })
  unlink(
    @Query('permissionId') permissionId: string,
    @Query('roleId') roleId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.permissionRoleService.unlink(permissionId, roleId, viewer);
  }

  @Patch(':id')
  @UseGuards(AdminRoleGuard)
  @CheckPolicies({ action: 'update', subject: 'Permission' })
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  @CheckPolicies({ action: 'delete', subject: 'Permission' })
  remove(@Param('id') id: string) {
    return this.permissionService.remove(id);
  }
}
