import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Clerk } from '@clerk/clerk-sdk-node';

@Injectable()
export class ClerkMiddleware implements NestMiddleware {
  private clerk: ReturnType<typeof Clerk>;

  constructor() {
    this.clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing or malformed authorization header');
      }

      const sessionToken = authHeader.split(' ')[1];
      if (!sessionToken) {
        throw new UnauthorizedException('No session token provided');
      }

      const session = await this.clerk.sessions.verifySession(sessionToken, sessionToken);
      if (!session || !session.userId) {
        throw new UnauthorizedException('Invalid or expired session token');
      }

      // Attach both `auth` and `user` for compatibility
      (req as any).auth = {
        userId: session.userId,
        sessionId: session.id,
        session,
      };

      // For controller's req.user?.sub
      (req as any).user = {
        sub: session.userId,
      };

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      next(new UnauthorizedException(errorMessage));
    }
  }
}
