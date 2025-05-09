import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ClerkMiddleware } from './auth/clerk.middleware';
import { requireAuth } from '@clerk/express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for frontend-backend communication
  app.enableCors({
    origin: '*', // Ideally restrict to frontend domain in production
    credentials: true,
  });

  // Apply Clerk middleware globally
  app.use(new ClerkMiddleware().use);
  app.use(requireAuth());


  // Serve static assets from /public
  app.useStaticAssets(join(__dirname, '..', 'public'));

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
