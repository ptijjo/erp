import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LeaveBalanceService } from '../hr/leave-balance.service';
import { MessagingAttachmentService } from '../messaging/messaging-attachment.service';
import { getRlsRequestStore } from '../prisma/rls-request-context';
import { allowAllGuard } from '../test/mocks/guards.mock';
import { CronController } from './cron.controller';
import { CronSecretGuard } from './cron-secret.guard';

describe('CronController', () => {
  let controller: CronController;
  let leave: { renewExerciseScheduled: jest.Mock };
  let messaging: { purgeOrphanAttachments: jest.Mock };

  beforeEach(async () => {
    leave = {
      renewExerciseScheduled: jest.fn().mockResolvedValue({ renewed: 1 }),
    };
    messaging = {
      purgeOrphanAttachments: jest.fn().mockResolvedValue({ purged: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CronController],
      providers: [
        { provide: LeaveBalanceService, useValue: leave },
        { provide: MessagingAttachmentService, useValue: messaging },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(CronSecretGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get(CronController);
  });

  it('renouvelle les congés avec le bypass RLS actif', async () => {
    leave.renewExerciseScheduled.mockImplementation(() => {
      expect(getRlsRequestStore()?.bypass).toBe(true);
      return Promise.resolve({ renewed: 2 });
    });

    await expect(controller.renewLeaveExercise()).resolves.toEqual({
      renewed: 2,
    });
  });

  it('purge les pièces jointes avec le bypass RLS actif', async () => {
    messaging.purgeOrphanAttachments.mockImplementation(() => {
      expect(getRlsRequestStore()?.bypass).toBe(true);
      return Promise.resolve({ purged: 3 });
    });

    await expect(controller.purgeMessagingOrphanAttachments()).resolves.toEqual(
      {
        purged: 3,
      },
    );
  });
});
