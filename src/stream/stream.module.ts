import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stream } from './stream.entity';
import { LiveMetric } from './live-metric.entity';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { MetricService } from '../metrics/metric.service';
import { MetricController } from './metric.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Stream, LiveMetric])],
  providers: [StreamService, MetricService],
  controllers: [StreamController, MetricController],
})
export class StreamModule {}
