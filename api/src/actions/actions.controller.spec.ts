import { Test, TestingModule } from '@nestjs/testing';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';
import { TaskStatus } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { allowAllGuard } from '../test/mocks/guards.mock';

const viewer: AuthenticatedUser = {
  sub: 'u1',
  email: 'a@test.com',
  organisationId: 'org-1',
  organizationType: 'MAIN',
  role: { id: 'r1', name: 'ADMIN', poleCode: null },
};

describe('ActionsController', () => {
  let controller: ActionsController;
  let getTask: jest.Mock;
  let createSubtask: jest.Mock;
  let updateSubtask: jest.Mock;
  let removeSubtask: jest.Mock;

  beforeEach(async () => {
    getTask = jest.fn().mockResolvedValue({ id: 't1' });
    createSubtask = jest.fn().mockResolvedValue({ id: 't1' });
    updateSubtask = jest.fn().mockResolvedValue({ id: 't1' });
    removeSubtask = jest.fn().mockResolvedValue({ id: 't1' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionsController],
      providers: [
        {
          provide: ActionsService,
          useValue: {
            listActions: jest.fn(),
            createTask: jest.fn(),
            updateTask: jest.fn(),
            removeTask: jest.fn(),
            getTask,
            createSubtask,
            updateSubtask,
            removeSubtask,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(PoliciesGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get(ActionsController);
  });

  it('délègue getOne au service', async () => {
    await controller.getOne('t1', viewer);
    expect(getTask).toHaveBeenCalledWith('t1', viewer);
  });

  it('délègue createSubtask au service', async () => {
    await controller.createSubtask(
      't1',
      { title: 'Sous-tâche' },
      viewer,
    );
    expect(createSubtask).toHaveBeenCalledWith(
      't1',
      { title: 'Sous-tâche' },
      viewer,
    );
  });

  it('délègue updateSubtask au service', async () => {
    await controller.updateSubtask(
      't1',
      'st1',
      { status: TaskStatus.DONE },
      viewer,
    );
    expect(updateSubtask).toHaveBeenCalledWith(
      't1',
      'st1',
      { status: TaskStatus.DONE },
      viewer,
    );
  });

  it('délègue removeSubtask au service', async () => {
    await controller.removeSubtask('t1', 'st1', viewer);
    expect(removeSubtask).toHaveBeenCalledWith('t1', 'st1', viewer);
  });
});
