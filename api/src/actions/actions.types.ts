import type {
  TaskPriority,
  TaskScope,
  TaskStatus,
} from '../generated/prisma/client';

export type ActionItemKind = 'MANUAL' | 'SYSTEM';

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
  createdByUserId?: string;
  createdAt: string;
  completedAt: string | null;
  editable: boolean;
};

export const SYSTEM_ACTION_ID_PREFIX = 'system:';

export function isSystemActionId(id: string): boolean {
  return id.startsWith(SYSTEM_ACTION_ID_PREFIX);
}
