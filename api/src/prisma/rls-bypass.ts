import { PrismaService } from './prisma.service';

/** Active le bypass RLS (seeder, cron). Toujours appeler `clearRlsBypass` en finally. */
export async function enableRlsBypass(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.rls_bypass', 'on', false)`,
  );
}

export async function clearRlsBypass(prisma: PrismaService): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `SELECT set_config('app.rls_bypass', '', false)`,
    );
  } catch {
    /* ignore */
  }
}
