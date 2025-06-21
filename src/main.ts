import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { NmsService } from './nms/nms.service'; // Import NmsService
import { FirebaseAuthMiddleware } from './auth/firebase-auth.middleware'; // Import Firebase Auth Middleware

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Register Firebase Auth middleware
  // Note: For class-based middleware to be truly global in typical NestJS,
  // it's often registered in AppModule. This is a direct Express-style application.
  app.use((req, res, next) => {
    // This ensures that the middleware is instantiated correctly for each request
    // if it has dependencies or needs to be a class instance.
    // If FirebaseAuthMiddleware is simple and doesn't rely on DI for its own dependencies,
    // new FirebaseAuthMiddleware().use(req, res, next) would also work.
    // However, if FirebaseAuthMiddleware were to be @Injectable() and have its own
    // dependencies injected by Nest, this approach of manual instantiation here
    // would not work for those dependencies. A functional middleware or module-based
    // registration would be better. For now, assuming FirebaseAuthMiddleware is self-contained.
    const firebaseAuthMiddleware = new FirebaseAuthMiddleware();
    firebaseAuthMiddleware.use(req, res, next);
  });

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

  await app.listen(3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
