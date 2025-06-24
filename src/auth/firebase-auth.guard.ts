import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: any }>();
    if (!req.user || !req.user.uid) {
      throw new UnauthorizedException('User not authenticated');
    }
    return true;
  }
}
