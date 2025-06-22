import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase.config'; // Adjust path as necessary

@Injectable()
export class FirebaseAuthMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing Authorization Header');
    }

    const [bearer, token] = authorizationHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization Header format. Expected: Bearer <token>');
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      // Attach user to request object. You might want to define a custom request interface.
      // For now, we'll use a dynamic property.
      (req as any).user = decodedToken;
      next();
    } catch (e) {
      const error = e as { code?: string; message?: string }; // Type assertion
      console.error('Error verifying Firebase ID token:', error.message, error);
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Firebase ID token has expired.');
      }
      if (error.code === 'auth/argument-error') {
         throw new UnauthorizedException('Firebase ID token is malformed or invalid.');
      }
      throw new ForbiddenException('Invalid Firebase ID token.');
    }
  }
}
