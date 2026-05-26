import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Lance le seeder (`SeederService.onModuleInit`) sans démarrer le serveur HTTP.
 */
async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  await app.close();
  Logger.log('Seed terminé.', 'Seed');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
