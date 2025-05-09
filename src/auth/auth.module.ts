import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ClerkJwtStrategy } from './clerk.strategy';

@Module({
  imports: [PassportModule],
  providers: [ClerkJwtStrategy],
})
export class AuthModule {}
