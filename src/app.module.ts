import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Stream } from './stream/stream.entity';
import { User } from './stream/user.entity';

import { NmsService } from './nms/nms.service';
import { StreamService } from './stream/stream.service';

import { StreamController } from './stream/stream.controller';

import { MetricsModule } from './metrics/metric.module';

import { AdsModule } from './ads/ads.module';
import { ClerkMiddleware } from './auth/clerk.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdsModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'src/data/streaming.db',
      entities: [Stream, User],
      synchronize: true, // Set to false in production
    }),
    TypeOrmModule.forFeature([Stream, User]),
    MetricsModule,
  ],
  controllers: [StreamController],
  providers: [NmsService, StreamService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ClerkMiddleware)
      .forRoutes('stream');
  }
}
