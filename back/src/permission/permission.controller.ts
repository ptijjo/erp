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
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
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
  findByRole(@Param('roleId') roleId: string) {
    return this.permissionRoleService.findByRoleId(roleId);
  }

  @Get('by-permission/:permissionId')
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findByPermission(@Param('permissionId') permissionId: string) {
    return this.permissionRoleService.findByPermissionId(permissionId);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findAll() {
    return this.permissionService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Permission' })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Permission' })
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Permission' })
  remove(@Param('id') id: string) {
    return this.permissionService.remove(id);
  }

  @Post('link')
  @CheckPolicies({ action: 'update', subject: 'Permission' })
  link(@Body() dto: LinkPermissionRoleDto) {
    return this.permissionRoleService.link(dto.permissionId, dto.roleId);
  }

  @Delete('link')
  @CheckPolicies({ action: 'update', subject: 'Permission' })
  unlink(
    @Query('permissionId') permissionId: string,
    @Query('roleId') roleId: string,
  ) {
    return this.permissionRoleService.unlink(permissionId, roleId);
  }
}
