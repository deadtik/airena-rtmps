import { Test, TestingModule } from '@nestjs/testing';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';
import { MetricService } from '../metrics/metric.service'; // StreamController depends on this
import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

// Define the FirebaseRequest interface (or import if it's shared)
interface FirebaseRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

describe('StreamController', () => {
  let controller: StreamController;
  let streamService: StreamService;
  // let metricService: MetricService; // Not directly testing metricService methods here yet

  const mockStreamService = {
    getOrCreateStreamKey: jest.fn(),
    regenerateStreamKey: jest.fn(),
    // Add other methods if other controller endpoints are tested:
    startStream: jest.fn(),
    stopStream: jest.fn(),
    listUserStreams: jest.fn(),
    getStreamDetails: jest.fn(),
    updateStreamSettings: jest.fn(),
  };

  const mockMetricService = {
    getMetrics: jest.fn(), // If any endpoint uses it directly
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreamController],
      providers: [
        { provide: StreamService, useValue: mockStreamService },
        { provide: MetricService, useValue: mockMetricService }, // Provide MetricService mock
      ],
    }).compile();

    controller = module.get<StreamController>(StreamController);
    streamService = module.get<StreamService>(StreamService); // Get the mock instance
    // metricService = module.get<MetricService>(MetricService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  describe('getStreamCredentials (@Get("credentials"))', () => {
    it('should call streamService.getOrCreateStreamKey with firebaseId and return its result', async () => {
      const firebaseId = 'test-firebase-uid';
      const mockRequest = { user: { uid: firebaseId } } as FirebaseRequest;
      const serviceResult = {
        streamKey: 'key123',
        streamUrl: 'rtmp://test/live/key123',
        hlsUrl: 'http://test/hls/key123/index.m3u8',
        isStreaming: false,
        streamSettings: { quality: 'high' }
      };
      mockStreamService.getOrCreateStreamKey.mockResolvedValue(serviceResult);

      const result = await controller.getStreamCredentials(mockRequest);

      expect(streamService.getOrCreateStreamKey).toHaveBeenCalledWith(firebaseId);
      expect(result).toEqual(serviceResult);
    });

    it('should throw UnauthorizedException if user or uid is missing', async () => {
      const mockRequestMissingUser = {} as FirebaseRequest;
      const mockRequestMissingUid = { user: {} } as FirebaseRequest;

      await expect(controller.getStreamCredentials(mockRequestMissingUser))
        .rejects.toThrow(new UnauthorizedException('User not authenticated.'));

      await expect(controller.getStreamCredentials(mockRequestMissingUid))
        .rejects.toThrow(new UnauthorizedException('User not authenticated.'));
    });
  });

  describe('regenerateStreamKey (@Post("regenerate-key"))', () => {
    it('should call streamService.regenerateStreamKey with firebaseId and return its result', async () => {
      const firebaseId = 'test-firebase-uid-regen';
      const mockRequest = { user: { uid: firebaseId } } as FirebaseRequest;
      const serviceResult = {
        streamKey: 'newKey456',
        streamUrl: 'rtmp://test/live/newKey456',
        hlsUrl: 'http://test/hls/newKey456/index.m3u8'
      };
      mockStreamService.regenerateStreamKey.mockResolvedValue(serviceResult);

      const result = await controller.regenerateStreamKey(mockRequest);

      expect(streamService.regenerateStreamKey).toHaveBeenCalledWith(firebaseId);
      expect(result).toEqual(serviceResult);
    });

    it('should throw UnauthorizedException if user or uid is missing', async () => {
      const mockRequestMissingUser = {} as FirebaseRequest;
      const mockRequestMissingUid = { user: {} } as FirebaseRequest;

      await expect(controller.regenerateStreamKey(mockRequestMissingUser))
        .rejects.toThrow(new UnauthorizedException('User not authenticated.'));

      await expect(controller.regenerateStreamKey(mockRequestMissingUid))
        .rejects.toThrow(new UnauthorizedException('User not authenticated.'));
    });
  });

  // Example of updating an existing test type (if there were any)
  describe('listUserStreams (@Get("list"))', () => {
    it('should use firebaseId from req.user.uid', async () => {
      const firebaseId = 'test-user-for-list';
      const mockRequest = { user: { uid: firebaseId } } as FirebaseRequest;
      const serviceResult = { streams: [] }; // Mocked response
      mockStreamService.listUserStreams.mockResolvedValue(serviceResult);

      await controller.listUserStreams(mockRequest);
      expect(streamService.listUserStreams).toHaveBeenCalledWith(firebaseId);
    });
  });
});
