import { Module } from '@nestjs/common';
import { FirebaseAuthMiddleware } from './firebase-auth.middleware';

@Module({
  providers: [FirebaseAuthMiddleware],
  exports: [FirebaseAuthMiddleware],
})
export class AuthModule {}
