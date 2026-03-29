import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  //Add Cookies Parser
  app.use(cookieParser());

  //Add Helmet
  app.use(helmet());

  //Add Cors
  app.enableCors({
    origin: process.env.FRONTEND_URL!,
    credentials: true,
  });

  //Add Swagger
  const config = new DocumentBuilder()
    .setTitle('Vifaa API')
    .setDescription('The Vifaa API description')
    .setVersion('1.0')
    .addTag('Vifaa')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.PORT!, () => {
    Logger.log(`Server is running on port ${process.env.PORT!}`);
  });
}
void bootstrap();
