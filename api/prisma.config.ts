import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from '@prisma/config';

config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '.env'), override: true });

function databaseUrl(): string {
  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const db = process.env.POSTGRES_DB?.trim();
  if (user && password && db) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `postgresql://${encodedUser}:${encodedPassword}@localhost:5432/${db}`;
  }

  const direct = process.env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }

  throw new Error(
    'DATABASE_URL manquante : définissez POSTGRES_* à la racine ou DATABASE_URL dans api/.env.',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl(),
  },
});
