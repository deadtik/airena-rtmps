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
      (req as any).user = decodedToken;
      next();
    } catch (error: unknown) {
      console.error('Error verifying Firebase ID token:', error);

      // Check if error is an object and has a "code" property
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const err = error as { code: string };

        if (err.code === 'auth/id-token-expired') {
          throw new UnauthorizedException('Firebase ID token has expired.');
        }

        if (err.code === 'auth/argument-error') {
          throw new UnauthorizedException('Firebase ID token is malformed or invalid.');
        }
      }

      throw new ForbiddenException('Invalid Firebase ID token.');
    }
  }
}
