import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { PROFILE_AVATAR_MAX_INPUT_BYTES } from '../storage/image-processor.service';
import { UserService } from './user.service';
import { CreateUserDto, UpdateMyProfileDto, UpdateUserDto } from './dto/user.dto';
import { PaginationQueryDto } from '../lib/pagination-query.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'User' })
  getUsers(
    @CurrentUser() viewer: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.userService.findAll(viewer, query);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateMyProfile(
    @Body() dto: UpdateMyProfileDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.userService.updateMyProfile(viewer.sub, dto);
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

  @Post(':id/profile-photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: PROFILE_AVATAR_MAX_INPUT_BYTES },
    }),
  )
  uploadProfilePhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.userService.uploadProfilePhoto(id, file, viewer);
  }

  @Delete(':id/profile-photo')
  @UseGuards(JwtAuthGuard)
  removeProfilePhoto(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.userService.removeProfilePhoto(id, viewer);
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
