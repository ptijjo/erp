import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CreateThreadDto,
  OpenThreadDto,
  SearchContactsQueryDto,
  SendMessageDto,
} from './dto/messaging.dto';
import { MessagingAttachmentService } from './messaging-attachment.service';
import { MESSAGE_ATTACHMENT_MAX_INPUT_BYTES } from './messaging-attachment.constants';
import { MessagingService } from './messaging.service';

@Controller('messaging')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly attachmentService: MessagingAttachmentService,
  ) {}

  @Get('contacts')
  @CheckPolicies({ action: 'read', subject: 'Message' })
  searchContacts(
    @Query() query: SearchContactsQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.searchContacts(
      viewer,
      query.q,
      query.limit ?? 20,
    );
  }

  @Get('threads')
  @CheckPolicies({ action: 'read', subject: 'Message' })
  listThreads(@CurrentUser() viewer: AuthenticatedUser) {
    return this.messagingService.listThreads(viewer);
  }

  @Get('threads/:id')
  @CheckPolicies({ action: 'read', subject: 'Message' })
  getThread(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.getThread(id, viewer);
  }

  @Get('threads/:id/messages')
  @CheckPolicies({ action: 'read', subject: 'Message' })
  listMessages(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.listMessages(id, viewer);
  }

  @Post('threads/:id/attachments')
  @CheckPolicies({ action: 'create', subject: 'Message' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MESSAGE_ATTACHMENT_MAX_INPUT_BYTES },
    }),
  )
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.attachmentService.uploadToThread(id, file, viewer);
  }

  @Get('attachments/:id/download')
  @CheckPolicies({ action: 'read', subject: 'Message' })
  async downloadAttachment(
    @Param('id') id: string,
    @Query('inline') inline: string | undefined,
    @CurrentUser() viewer: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.attachmentService.downloadAttachment(id, viewer);
    const encodedName = encodeURIComponent(file.fileName);
    const disposition =
      inline === 'true' &&
      (file.mimeType.startsWith('image/') ||
        file.mimeType === 'application/pdf')
        ? `inline; filename*=UTF-8''${encodedName}`
        : `attachment; filename*=UTF-8''${encodedName}`;

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.body.length);
    res.setHeader('Content-Disposition', disposition);
    res.end(file.body);
  }

  @Post('threads/open')
  @CheckPolicies({ action: 'create', subject: 'Message' })
  openThread(
    @Body() dto: OpenThreadDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.openDirectThread(dto.recipientUserId, viewer);
  }

  @Post('threads')
  @CheckPolicies({ action: 'create', subject: 'Message' })
  createThread(
    @Body() dto: CreateThreadDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.createThread(dto, viewer);
  }

  @Post('threads/:id/messages')
  @CheckPolicies({ action: 'create', subject: 'Message' })
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.sendMessage(id, dto, viewer);
  }

  @Delete('threads/:id')
  @CheckPolicies({ action: 'delete', subject: 'Message' })
  deleteThread(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.deleteThread(id, viewer);
  }

  @Patch('threads/:id/read')
  @CheckPolicies({ action: 'update', subject: 'Message' })
  markRead(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.markThreadRead(id, viewer);
  }
}
