// src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import { MetricService } from './metric.service';
import { MetricGateway } from './metrics.gateway';
import { MetricController } from './metric.controller';

@Module({
  providers: [MetricService, MetricGateway],
  controllers: [MetricController],
  exports: [MetricService],

})
export class MetricsModule {}
