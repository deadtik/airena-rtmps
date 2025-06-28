import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Stream } from './stream/stream.entity';
import { User } from './stream/user.entity';

import { NmsService } from './nms/nms.service';
import { StreamService } from './stream/stream.service';

import { MetricsModule } from './metrics/metric.module';
import { AdsModule } from './ads/ads.module';
import { AuthModule } from './auth/auth.module';
import { StreamModule } from './stream/stream.module';
import { VodModule } from './vod/vod.module'; // Import VOD module
import { FirebaseAuthMiddleware } from './auth/firebase-auth.middleware'; // Import Firebase Auth Middleware

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AdsModule,
    AuthModule,
    StreamModule,
    VodModule, // Add VOD module here
    MetricsModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'src/data/streaming.db',
      entities: [Stream, User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Stream, User]),
  ],
  providers: [NmsService, StreamService],
  exports: [NmsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FirebaseAuthMiddleware).forRoutes('stream');
  }
}
