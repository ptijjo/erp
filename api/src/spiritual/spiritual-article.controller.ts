import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import {
  CreateSpiritualArticleDto,
  UpdateSpiritualArticleDto,
} from './dto/spiritual-article.dto';
import { SpiritualArticleService } from './spiritual-article.service';

@Controller('spiritual/articles')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SpiritualArticleController {
  constructor(private readonly articleService: SpiritualArticleService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'SpiritualArticle' })
  findFeed(@CurrentUser() viewer: AuthenticatedUser) {
    return this.articleService.findPublishedFeed(viewer);
  }

  @Get('manage')
  @CheckPolicies({ action: 'update', subject: 'SpiritualArticle' })
  findManageList(@CurrentUser() viewer: AuthenticatedUser) {
    return this.articleService.findManageList(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'SpiritualArticle' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.articleService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'SpiritualArticle' })
  create(
    @Body() dto: CreateSpiritualArticleDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.articleService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'SpiritualArticle' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpiritualArticleDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.articleService.update(id, dto, viewer);
  }

  @Post(':id/publish')
  @CheckPolicies({ action: 'update', subject: 'SpiritualArticle' })
  publish(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.articleService.publish(id, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'SpiritualArticle' })
  remove(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.articleService.remove(id, viewer);
  }

  @Post(':id/cover')
  @CheckPolicies({ action: 'update', subject: 'SpiritualArticle' })
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: memoryStorage(),
      limits: { fileSize: PROFILE_AVATAR_MAX_INPUT_BYTES },
    }),
  )
  uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.articleService.uploadCover(id, file, viewer);
  }

  @Delete(':id/cover')
  @CheckPolicies({ action: 'update', subject: 'SpiritualArticle' })
  removeCover(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.articleService.removeCover(id, viewer);
  }
}
