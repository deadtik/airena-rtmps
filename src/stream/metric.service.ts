// src/metrics/metric.service.ts
import { Injectable } from '@nestjs/common';

export interface MetricState {
  bitrate: number;   // in kbps
  bandwidth: number; // in Mbps
  latency: number;   // in ms or fps delay
  lastUpdated: number;
}

@Injectable()
export class MetricService {
  private metrics: Record<string, MetricState> = {}; // keyed by streamKey

  updateMetrics(streamKey: string, updates: Partial<MetricState>) {
    console.log(`Updating metrics for streamKey: ${streamKey}`, updates);
    const existing = this.metrics[streamKey] || {
      bitrate: 0,
      bandwidth: 0,
      latency: 0,
      lastUpdated: Date.now(),
    };

    this.metrics[streamKey] = {
      ...existing,
      ...updates,
      lastUpdated: Date.now(),
    };
  }

  getMetrics(streamKey: string): MetricState | null {
    return this.metrics[streamKey] || null;
  }

  getCurrentMetrics(): MetricState {
    // For now, return the latest single stream (expandable to multi-stream later)
    const keys = Object.keys(this.metrics);
    if (keys.length === 0) return { bitrate: 0, bandwidth: 0, latency: 0, lastUpdated: Date.now() };
    return this.metrics[keys[0]];
  }

  resetMetrics(streamKey: string) {
    delete this.metrics[streamKey];
  }
}
