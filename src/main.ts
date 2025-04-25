import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { startNMS } from './nms/nms';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'));
  startNMS();
  await app.listen(3000);
}
bootstrap();