import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stream } from './stream.entity';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { MetricService } from '../metrics/metric.service';
import { MetricController } from '../metrics/metric.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Stream])],
  providers: [StreamService, MetricService],
  controllers: [StreamController, MetricController],
})
export class StreamModule {}
