import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { FullAccessRoleGuard } from '../casl/full-access-role.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { RoleService } from './role.service';
import { Role } from '../generated/prisma/client';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Controller('role')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @CheckPolicies({ action: 'read', subject: 'Role' })
  public getAllRoles(): Promise<Role[]> {
    return this.roleService.getAllRoles();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @CheckPolicies({ action: 'read', subject: 'Role' })
  public getRoleById(@Param('id') id: string): Promise<Role> {
    return this.roleService.getRoleById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPolicies({ action: 'create', subject: 'Role' })
  public createRole(@Body() data: CreateRoleDto): Promise<Role> {
    return this.roleService.createRole(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FullAccessRoleGuard)
  @CheckPolicies({ action: 'update', subject: 'Role' })
  public updateRole(
    @Param('id') id: string,
    @Body() data: UpdateRoleDto,
  ): Promise<Role> {
    return this.roleService.updateRole(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FullAccessRoleGuard)
  @CheckPolicies({ action: 'delete', subject: 'Role' })
  public deleteRole(@Param('id') id: string): Promise<Role> {
    return this.roleService.deleteRole(id);
  }
}
