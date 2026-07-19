import type {
  TaskPriority,
  TaskScope,
  TaskStatus,
} from '../generated/prisma/client';

export type ActionItemKind = 'MANUAL' | 'SYSTEM';

export type ActionUserSummaryDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
};

export type TaskSubtaskDto = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
};

export type SubtaskProgressDto = {
  done: number;
  total: number;
  percent: number;
};

export type ActionItemDto = {
  id: string;
  kind: ActionItemKind;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  scope?: TaskScope;
  startDate: string | null;
  dueDate: string | null;
  href?: string;
  organizationId?: string;
  organizationName?: string;
  assigneeUserId?: string | null;
  /** Responsable assigné (peut être absent). */
  assignee?: ActionUserSummaryDto | null;
  createdByUserId?: string;
  /** Créateur de la tâche (toujours renseigné pour les tâches manuelles). */
  createdBy?: ActionUserSummaryDto | null;
  createdAt: string;
  completedAt: string | null;
  editable: boolean;
  subtasks?: TaskSubtaskDto[];
  subtaskProgress?: SubtaskProgressDto;
};

export const SYSTEM_ACTION_ID_PREFIX = 'system:';

export function isSystemActionId(id: string): boolean {
  return id.startsWith(SYSTEM_ACTION_ID_PREFIX);
}

export function computeSubtaskProgress(
  subtasks: { status: TaskStatus }[],
): SubtaskProgressDto {
  const total = subtasks.length;
  const done = subtasks.filter((s) => s.status === 'DONE').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

/** Statut parent dérivé des sous-tâches (si total > 0). */
export function deriveParentStatusFromSubtasks(
  subtasks: { status: TaskStatus }[],
): TaskStatus | null {
  if (subtasks.length === 0) {
    return null;
  }
  if (subtasks.every((s) => s.status === 'DONE')) {
    return 'DONE';
  }
  return 'IN_PROGRESS';
}
