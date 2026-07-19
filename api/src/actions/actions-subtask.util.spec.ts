import {
  computeSubtaskProgress,
  deriveParentStatusFromSubtasks,
} from './actions.types';
import { TaskStatus } from '../generated/prisma/client';

describe('computeSubtaskProgress', () => {
  it('retourne 0/0 si aucune sous-tâche', () => {
    expect(computeSubtaskProgress([])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });
  });

  it('calcule done/total et le pourcentage', () => {
    expect(
      computeSubtaskProgress([
        { status: TaskStatus.DONE },
        { status: TaskStatus.TODO },
        { status: TaskStatus.DONE },
      ]),
    ).toEqual({ done: 2, total: 3, percent: 67 });
  });
});

describe('deriveParentStatusFromSubtasks', () => {
  it('retourne null sans sous-tâches', () => {
    expect(deriveParentStatusFromSubtasks([])).toBeNull();
  });

  it('passe en DONE si toutes terminées', () => {
    expect(
      deriveParentStatusFromSubtasks([
        { status: TaskStatus.DONE },
        { status: TaskStatus.DONE },
      ]),
    ).toBe(TaskStatus.DONE);
  });

  it('passe en IN_PROGRESS sinon', () => {
    expect(
      deriveParentStatusFromSubtasks([
        { status: TaskStatus.DONE },
        { status: TaskStatus.TODO },
      ]),
    ).toBe(TaskStatus.IN_PROGRESS);
  });
});
