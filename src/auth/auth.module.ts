import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ClerkJwtStrategy } from './clerk.strategy';
import { ClerkAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'clerk-jwt' })],
  providers: [ClerkJwtStrategy, ClerkAuthGuard],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
