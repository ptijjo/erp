jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn(),
}));

jest.mock('../generated/prisma/client', () => {
  class PrismaClient {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
    $extends = jest.fn().mockImplementation(function (this: PrismaClient) {
      return this;
    });
  }
  return {
    PrismaClient,
    OrganizationType: { MAIN: 'MAIN', SUBSIDIARY: 'SUBSIDIARY' },
  };
});

jest.mock('./prisma-audit.extension', () => ({
  extendPrismaWithAudit: <T>(client: T): T => client,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test';
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('instancie le service sans connexion réelle', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
    expect(service.raw).toBeDefined();
  });
});
