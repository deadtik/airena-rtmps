// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Serve the HLS media folder
  app.use('/media', express.static(join(__dirname, '..', 'public', 'media')));

  await app.listen(8000);
}
bootstrap();
