import { AppCacheService } from '../../cache/app-cache.service';

export const mockAppCacheServiceProvider = {
  provide: AppCacheService,
  useValue: {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } satisfies Partial<AppCacheService>,
};
