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
} from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from '../generated/prisma/client';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  public getAllRoles(): Promise<Role[]> {
    return this.roleService.getAllRoles();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public getRoleById(@Param('id') id: string): Promise<Role> {
    return this.roleService.getRoleById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public createRole(@Body() data: CreateRoleDto): Promise<Role> {
    return this.roleService.createRole(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  public updateRole(
    @Param('id') id: string,
    @Body() data: UpdateRoleDto,
  ): Promise<Role> {
    return this.roleService.updateRole(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public deleteRole(@Param('id') id: string): Promise<Role> {
    return this.roleService.deleteRole(id);
  }
}
