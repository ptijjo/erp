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
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { ActionsService } from './actions.service';
import {
  CreateTaskDto,
  CreateTaskSubtaskDto,
  ListActionsQueryDto,
  UpdateTaskDto,
  UpdateTaskSubtaskDto,
} from './dto/actions.dto';

@Controller('actions')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Task' })
  list(
    @Query() query: ListActionsQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.actionsService.listActions(viewer, query.status);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Task' })
  getOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.actionsService.getTask(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Task' })
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.actionsService.createTask(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Task' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.actionsService.updateTask(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Task' })
  remove(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.actionsService.removeTask(id, viewer);
  }

  @Post(':id/subtasks')
  @CheckPolicies({ action: 'update', subject: 'Task' })
  createSubtask(
    @Param('id') id: string,
    @Body() dto: CreateTaskSubtaskDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.actionsService.createSubtask(id, dto, viewer);
  }

  @Patch(':taskId/subtasks/:subtaskId')
  @CheckPolicies({ action: 'update', subject: 'Task' })
  updateSubtask(
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @Body() dto: UpdateTaskSubtaskDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.actionsService.updateSubtask(
      taskId,
      subtaskId,
      dto,
      viewer,
    );
  }

  @Delete(':taskId/subtasks/:subtaskId')
  @CheckPolicies({ action: 'update', subject: 'Task' })
  removeSubtask(
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.actionsService.removeSubtask(taskId, subtaskId, viewer);
  }
}
