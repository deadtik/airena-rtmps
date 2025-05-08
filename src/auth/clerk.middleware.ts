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
      const sessionToken = req.headers.authorization?.split(' ')[1];
      
      if (!sessionToken) {
        throw new UnauthorizedException('No session token provided');
      }

      const session = await this.clerk.sessions.verifySession(sessionToken, sessionToken);
      if (!session) {
        throw new UnauthorizedException('Invalid session token');
      }

      // Attach user info to request
      (req as any).auth = {
        userId: session.userId,
        sessionId: session.id
      };

      next();
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
} 