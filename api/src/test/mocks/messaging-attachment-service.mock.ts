import { MessagingAttachmentService } from '../../messaging/messaging-attachment.service';

export const mockMessagingAttachmentServiceProvider = {
  provide: MessagingAttachmentService,
  useValue: {
    deleteAllThreadsForUser: jest.fn(),
    deleteAllAttachmentsForThread: jest.fn(),
    purgeOrphanAttachments: jest.fn(),
  },
};
