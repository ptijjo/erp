import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheck: { check: jest.Mock };

  beforeEach(async () => {
    healthCheck = { check: jest.fn().mockResolvedValue({ status: 'ok' }) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheck },
        {
          provide: HttpHealthIndicator,
          useValue: {
            pingCheck: jest
              .fn()
              .mockResolvedValue({ 'vifaa-api': { status: 'up' } }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('délègue au HealthCheckService', async () => {
    await controller.check();
    expect(healthCheck.check).toHaveBeenCalled();
  });
});
