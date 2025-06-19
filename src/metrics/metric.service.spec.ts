// src/metrics/metric.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MetricService, MetricState } from './metric.service';
import { MetricGateway } from './metrics.gateway';

describe('MetricService', () => {
  let service: MetricService;
  let gateway: MetricGateway;

  // Mock MetricGateway
  const mockMetricGateway = {
    broadcastMetrics: jest.fn(),
    // Add other methods if MetricService uses them
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricService,
        {
          provide: MetricGateway,
          useValue: mockMetricGateway,
        },
      ],
    }).compile();

    service = module.get<MetricService>(MetricService);
    gateway = module.get<MetricGateway>(MetricGateway);

    jest.clearAllMocks();
    // Clear the internal metrics store in the service for each test
    (service as any).metrics = {};
  });

  describe('updateMetrics', () => {
    it('should initialize metrics for a new streamKey and broadcast', () => {
      const streamKey = 'newStream';
      const updates: Partial<MetricState> = { bitrate: 1000, latency: 100 };
      const expectedDateNow = Date.now(); // Capture timestamp before call
      jest.spyOn(Date, 'now').mockReturnValue(expectedDateNow);

      service.updateMetrics(streamKey, updates);

      const expectedMetrics: MetricState & { streamKey: string } = {
        streamKey,
        bitrate: 1000,
        bandwidth: 0, // Default from initialization
        latency: 100,
        lastUpdated: expectedDateNow,
      };

      expect((service as any).metrics[streamKey]).toEqual(expect.objectContaining(updates));
      expect((service as any).metrics[streamKey].lastUpdated).toBe(expectedDateNow);
      expect(gateway.broadcastMetrics).toHaveBeenCalledWith(streamKey, expectedMetrics);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should update existing metrics and broadcast', () => {
      const streamKey = 'existingStream';
      const initialMetrics: MetricState = {
        bitrate: 500,
        bandwidth: 600,
        latency: 50,
        lastUpdated: Date.now() - 10000, // Some time ago
      };
      (service as any).metrics[streamKey] = initialMetrics;

      const updates: Partial<MetricState> = { bitrate: 1500, bandwidth: 1800 };
      const expectedDateNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(expectedDateNow);

      service.updateMetrics(streamKey, updates);

      const expectedBroadcastMetrics: MetricState & { streamKey: string } = {
        streamKey,
        bitrate: 1500,
        bandwidth: 1800,
        latency: initialMetrics.latency, // Unchanged
        lastUpdated: expectedDateNow,
      };

      expect((service as any).metrics[streamKey]).toEqual({
        ...initialMetrics,
        ...updates,
        lastUpdated: expectedDateNow,
      });
      expect(gateway.broadcastMetrics).toHaveBeenCalledWith(streamKey, expectedBroadcastMetrics);
      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('getMetrics', () => {
    it('should return null for a non-existent streamKey', () => {
      expect(service.getMetrics('unknownStream')).toBeNull();
    });

    it('should return the correct metrics for an existing streamKey', () => {
      const streamKey = 'testStream';
      const metrics: MetricState = {
        bitrate: 2000,
        bandwidth: 2400,
        latency: 120,
        lastUpdated: Date.now(),
      };
      (service as any).metrics[streamKey] = metrics;

      expect(service.getMetrics(streamKey)).toEqual(metrics);
    });
  });

  describe('getAllMetrics', () => {
    it('should return all stored metrics', () => {
      const metrics1: MetricState = { bitrate: 1, bandwidth: 1, latency: 1, lastUpdated: Date.now() };
      const metrics2: MetricState = { bitrate: 2, bandwidth: 2, latency: 2, lastUpdated: Date.now() };
      (service as any).metrics['stream1'] = metrics1;
      (service as any).metrics['stream2'] = metrics2;

      expect(service.getAllMetrics()).toEqual({
        stream1: metrics1,
        stream2: metrics2,
      });
    });
  });

  describe('resetMetrics', () => {
    it('should delete metrics for a given streamKey', () => {
      const streamKey = 'streamToReset';
      (service as any).metrics[streamKey] = { bitrate: 100, bandwidth: 120, latency: 30, lastUpdated: Date.now() };

      service.resetMetrics(streamKey);
      expect((service as any).metrics[streamKey]).toBeUndefined();
    });

    it('should do nothing if streamKey does not exist', () => {
      service.resetMetrics('nonExistentKey');
      expect((service as any).metrics['nonExistentKey']).toBeUndefined();
    });
  });
});
