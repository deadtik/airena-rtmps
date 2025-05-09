import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

@Injectable()
export class ClerkMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, sessionId, getToken } = getAuth(req);

      if (!userId || !sessionId) {
        throw new UnauthorizedException('User not authenticated');
      }

      (req as any).auth = {
        userId,
        sessionId,
        token: await getToken(),
      };

      (req as any).user = {
        sub: userId,
      };

      next();
    } catch (error) {
      console.error('ClerkMiddleware error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
