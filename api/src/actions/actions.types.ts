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

export type ActionItemDto = {
  id: string;
  kind: ActionItemKind;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  scope?: TaskScope;
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
};

export const SYSTEM_ACTION_ID_PREFIX = 'system:';

export function isSystemActionId(id: string): boolean {
  return id.startsWith(SYSTEM_ACTION_ID_PREFIX);
}
