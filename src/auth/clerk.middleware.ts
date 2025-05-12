import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

@Injectable()
export class ClerkMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      throw new UnauthorizedException('Authentication failed');
    }

    (req as any).auth = auth;
    (req as any).user = { sub: auth.userId };
    next();
  }
}