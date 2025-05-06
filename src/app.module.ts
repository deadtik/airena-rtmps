import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Stream } from './stream/stream.entity';

import { NmsService } from './nms/nms.service';
import { StreamService } from './stream/stream.service';

import { StreamController } from './stream/stream.controller';

import { MetricsModule } from './metrics/metric.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'src/data/streaming.db',
      entities: [Stream],
      synchronize: true, // Set to false in production
    }),
    TypeOrmModule.forFeature([Stream]),
    MetricsModule,
  ],
  controllers: [StreamController],
  providers: [NmsService, StreamService],
})
export class AppModule {}
