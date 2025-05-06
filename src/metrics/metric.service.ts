// src/metrics/metric.service.ts
import { Injectable } from '@nestjs/common';
import { MetricGateway } from './metrics.gateway';

export interface MetricState {
  bitrate: number;
  bandwidth: number;
  latency: number;
  lastUpdated: number;
}

@Injectable()
export class MetricService {
  private metrics: Record<string, MetricState> = {};

  constructor(private readonly gateway: MetricGateway) {}

  updateMetrics(streamKey: string, updates: Partial<MetricState>) {
    const existing = this.metrics[streamKey] || {
      bitrate: 0,
      bandwidth: 0,
      latency: 0,
      lastUpdated: Date.now(),
    };

    const updated = {
      ...existing,
      ...updates,
      lastUpdated: Date.now(),
    };

    this.metrics[streamKey] = updated;

    this.gateway.broadcastMetrics(streamKey, updated);
  }

  getMetrics(streamKey: string): MetricState | null {
    return this.metrics[streamKey] || null;
  }

  getAllMetrics(): Record<string, MetricState> {
    return this.metrics;
  }

  resetMetrics(streamKey: string) {
    delete this.metrics[streamKey];
  }
}
