import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { clerkMiddleware } from '@clerk/express';
import { NmsService } from './nms/nms.service'; // Import NmsService

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Register Clerk middleware first
  app.use(clerkMiddleware());

  // Enable CORS for frontend-backend communication
  app.enableCors({
    origin: 'https://airena-streamui.vercel.app', // your frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve static assets (optional)
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Inject NmsService and start the NodeMediaServer
  const nmsService = app.get(NmsService);
  nmsService.onModuleInit(); // This will start NMS

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
