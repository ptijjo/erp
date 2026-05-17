import { Test, TestingModule } from '@nestjs/testing';
import { StockOrderController } from './stock-order.controller';
import { StockOrderService } from './stock-order.service';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { allowAllGuard } from '../test/mocks/guards.mock';
import type { AuthenticatedUser } from '../auth/auth.types';
import { StockOrderStatus } from '../generated/prisma/client';

const viewer: AuthenticatedUser = {
  sub: 'u-sub',
  email: 'mgr@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: { id: 'r1', name: 'MANAGER', description: null, poleCode: null },
};

describe('StockOrderController', () => {
  let controller: StockOrderController;
  let stockOrderService: {
    findAll: jest.Mock;
    create: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(async () => {
    stockOrderService = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'order-1' }),
      updateStatus: jest.fn().mockResolvedValue({ id: 'order-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockOrderController],
      providers: [{ provide: StockOrderService, useValue: stockOrderService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(PoliciesGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<StockOrderController>(StockOrderController);
  });

  it('délègue findAll au service', async () => {
    await controller.findAll(viewer, 'org-sub');
    expect(stockOrderService.findAll).toHaveBeenCalledWith(viewer, 'org-sub');
  });

  it('délègue create au service', async () => {
    const dto = {
      productId: 'p1',
      supplierId: 's1',
      quantity: 2,
    };
    await controller.create(dto, viewer);
    expect(stockOrderService.create).toHaveBeenCalledWith(dto, viewer);
  });

  it('délègue updateStatus au service', async () => {
    const dto = { status: 'CONFIRMED' as const };
    await controller.updateStatus('order-1', dto, viewer);
    expect(stockOrderService.updateStatus).toHaveBeenCalledWith(
      'order-1',
      StockOrderStatus.CONFIRMED,
      viewer,
    );
  });
});
