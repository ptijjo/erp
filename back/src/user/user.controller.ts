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
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'User' })
  getUsers(@CurrentUser() viewer: AuthenticatedUser) {
    return this.userService.findAll(viewer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'User' })
  getUser(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.userService.findOne(id, viewer);
  }

  @Post('')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({ action: 'create', subject: 'User' })
  createUser(
    @Body() user: CreateUserDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.userService.create(user, user.organizationId, viewer);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({ action: 'update', subject: 'User' })
  updateUser(
    @Param('id') id: string,
    @Body() user: UpdateUserDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.userService.update(id, user, viewer);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({ action: 'delete', subject: 'User' })
  deleteUser(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.userService.delete(id, viewer);
  }
}
