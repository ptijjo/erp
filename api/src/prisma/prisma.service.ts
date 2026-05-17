import { Injectable, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { extendPrismaWithAudit } from './prisma-audit.extension';

export type AppPrismaClient = ReturnType<typeof extendPrismaWithAudit>;

@Injectable()
export class PrismaService extends PrismaClient {
  /** Client sans extension (écritures dans AuditLog sans boucle ni doublon). */
  declare readonly raw: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    super({ adapter });
    const extended = extendPrismaWithAudit(this);
    Object.assign(extended, {
      raw: this,
      onModuleInit: async () => {
        try {
          await extended.$queryRaw`SELECT 1`;
          Logger.log('Database connected successfully');
        } catch (error) {
          Logger.error('Database connection failed', error);
          throw error;
        }
      },
    });
    return extended as this;
  }
}
