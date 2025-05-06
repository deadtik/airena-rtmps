// src/metrics/metric.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { MetricService } from './metric.service';

@Controller('metrics')
export class MetricController {
  constructor(private readonly metricService: MetricService) {}

  @Get(':streamKey')
  getStreamMetrics(@Param('streamKey') streamKey: string) {
    return this.metricService.getMetrics(streamKey);
  }

  @Get()
  getAllStreamMetrics() {
    return this.metricService.getAllMetrics();
  }
}
