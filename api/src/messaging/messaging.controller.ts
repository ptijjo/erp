import {
  Body,
  Controller,
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
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CreateThreadDto,
  SearchContactsQueryDto,
  SendMessageDto,
} from './dto/messaging.dto';
import { MessagingService } from './messaging.service';

@Controller('messaging')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

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

  @Patch('threads/:id/read')
  @CheckPolicies({ action: 'update', subject: 'Message' })
  markRead(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.messagingService.markThreadRead(id, viewer);
  }
}
