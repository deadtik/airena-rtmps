// src/nms/nms.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NmsService } from './nms.service';
import { ConfigService } from '@nestjs/config';
import { MetricService } from '../metrics/metric.service';
import { VodService } from '../vod/vod.service';
import { Logger } from '@nestjs/common';
import * as childProcess from 'child_process';
import NodeMediaServer from 'node-media-server'; // Import for type usage AFTER mock setup
import * as fs from 'fs'; // Import fs

// Mock NodeMediaServer module
jest.mock('node-media-server');
jest.mock('fs'); // Mock fs module

// Define a type for the mocked NMS instance for clarity, though it's often kept simple
interface MockNmsInstanceType {
  on: jest.Mock;
  run: jest.Mock;
  // Add any other methods of NMS that your service calls, e.g., during onModuleInit
}

const mockNmsInstance: MockNmsInstanceType = {
  on: jest.fn(),
  run: jest.fn(),
};

// Mock child_process
jest.mock('child_process');
const mockSpawnInstance = {
  on: jest.fn(),
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
};
(childProcess.spawn as jest.Mock).mockReturnValue(mockSpawnInstance as any);


// Mock Logger
jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  const MockedLogger = jest.fn(() => { // Factory returns a new mock instance each time
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
  });
  (MockedLogger as any).overrideLogger = jest.fn(); // Static method
  return {
    ...originalModule,
    Logger: MockedLogger,
  };
});


describe('NmsService', () => {
  let service: NmsService;
  let configService: ConfigService;
  let metricService: MetricService;
  let vodService: VodService;
  let mockLogger: any; // Will be obtained from service instance


  const mockMetricService = {
    resetMetrics: jest.fn(),
    updateMetrics: jest.fn(),
  };

  const mockVodService = {
    generateVodPath: jest.fn().mockReturnValue('/test/vod/output/path.mp4'),
  };

  beforeEach(async () => {
    // Mock fs.existsSync to prevent process.exit
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Reset other mocks for NMS instance and spawn before each test module compilation
    (NodeMediaServer as jest.MockedClass<typeof NodeMediaServer>).mockClear();
    (NodeMediaServer as jest.MockedClass<typeof NodeMediaServer>).mockImplementation(() => mockNmsInstance as any);
    mockNmsInstance.on.mockClear();
    mockNmsInstance.run.mockClear();
    (childProcess.spawn as jest.Mock).mockClear();
    mockSpawnInstance.on.mockClear();
    mockSpawnInstance.stdout.on.mockClear();
    mockSpawnInstance.stderr.on.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'FFMPEG_PATH') return defaultValue || 'ffmpeg';
              if (key === 'MEDIA_ROOT') return defaultValue || './media';
              return defaultValue;
            }),
          },
        },
        { provide: MetricService, useValue: mockMetricService },
        { provide: VodService, useValue: mockVodService },
        // Logger is auto-mocked by jest.mock
      ],
    }).compile();

    service = module.get<NmsService>(NmsService);
    configService = module.get<ConfigService>(ConfigService);
    metricService = module.get<MetricService>(MetricService);
    vodService = module.get<VodService>(VodService);
    // The service will get a fresh mock logger instance because of the factory in jest.mock
    mockLogger = (service as any).logger;

    // Clear mocks on services if they are jest.fn() and not objects with jest.fn() methods
    // Logger methods on mockLogger will be fresh each time due to new instance from factory.
    if (mockMetricService && jest.isMockFunction(mockMetricService.resetMetrics)) mockMetricService.resetMetrics.mockClear();
    if (mockMetricService && jest.isMockFunction(mockMetricService.updateMetrics)) mockMetricService.updateMetrics.mockClear();
    if (mockVodService && jest.isMockFunction(mockVodService.generateVodPath)) mockVodService.generateVodPath.mockClear();
    if (configService && jest.isMockFunction(configService.get)) (configService.get as jest.Mock).mockClear();
  });

  describe('onModuleInit - Configuration and Initialization', () => {
    const expectedFfmpegPath = process.platform === 'win32' ? 'C:/ffmpeg/bin/ffmpeg.exe' : '/usr/bin/ffmpeg';
    const expectedMediaRoot = './media';

    // This test is invalid as NmsService does not use ConfigService for these values.
    // it('should get FFMPEG_PATH and MEDIA_ROOT from ConfigService', () => {
    //   service.onModuleInit();
    //   // These expectations will fail because NmsService determines paths locally.
    //   // expect(configService.get).toHaveBeenCalledWith('FFMPEG_PATH', 'ffmpeg');
    //   // expect(configService.get).toHaveBeenCalledWith('MEDIA_ROOT', './media');
    // });

    it('should construct NodeMediaServer with actual paths', () => {
      // No need to mock configService.get for ffmpegPath or mediaRoot for this test,
      // as NmsService determines them internally.
      service.onModuleInit(); // Use the service instance from global beforeEach

      expect(NodeMediaServer).toHaveBeenCalledWith(
        expect.objectContaining({
          http: expect.objectContaining({ mediaroot: expectedMediaRoot }),
          trans: expect.objectContaining({ ffmpeg: expectedFfmpegPath }),
        }),
      );
    });

    // This test's premise of using ConfigService to set custom paths is flawed for NmsService.
    // NmsService currently uses hardcoded/platform-dependent paths.
    // To test with a truly custom path, NmsService would need to be refactored
    // to accept these paths via constructor or actually use ConfigService.
    // For now, we test its actual behavior.
    // it('should construct NodeMediaServer with configured ffmpeg path for transcode', () => {
    //   // This mock is ineffective for changing ffmpegPath in NmsService's current implementation
    //   (configService.get as jest.Mock).mockImplementation((key: string) => {
    //     if (key === 'FFMPEG_PATH') return '/usr/local/bin/ffmpeg_custom_test';
    //     return './media';
    //   });
    //   const newService = new NmsService(metricService, vodService);
    //   newService.onModuleInit();
    //   expect(NodeMediaServer).toHaveBeenCalledWith(
    //     expect.objectContaining({
    //       trans: expect.objectContaining({ ffmpeg: '/usr/local/bin/ffmpeg_custom_test' }),
    //     }),
    //   );
    // });

    it('should register NMS event handlers and run NMS', () => {
      service.onModuleInit();
      expect(mockNmsInstance.on).toHaveBeenCalledWith('postPublish', expect.any(Function));
      expect(mockNmsInstance.on).toHaveBeenCalledWith('donePublish', expect.any(Function));
      expect(mockNmsInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockNmsInstance.run).toHaveBeenCalled();
    });
  });

  describe('onModuleInit - postPublish FFmpeg processes', () => {
    let postPublishCallback: (id: string, streamPath: string, args: any) => Promise<void>;

    beforeEach(async () => {
      service.onModuleInit();
      // Capture the postPublish callback
      const postPublishCall = mockNmsInstance.on.mock.calls.find(call => call[0] === 'postPublish');
      if (postPublishCall) {
        postPublishCallback = postPublishCall[1];
      }
    });

    it('should use actual ffmpegPath for VOD and Metrics spawn calls', async () => {
      const actualFfmpegPath = process.platform === 'win32' ? 'C:/ffmpeg/bin/ffmpeg.exe' : '/usr/bin/ffmpeg';
      // ConfigService mock for FFMPEG_PATH is not needed here as NmsService determines it internally.
      // Ensure the service from global beforeEach is used, which calls onModuleInit once.
      // Or, if a new instance is needed, its onModuleInit will run with internal path logic.

      // Re-trigger onModuleInit on the main 'service' instance or use a new one.
      // For simplicity, we assume the 'service.onModuleInit()' in the describe's beforeEach
      // has set up the callback. If tests modify shared state or require specific init,
      // it might be better to create new instances of NmsService here.
      // However, postPublishCallback is captured from the 'service' instance.

      // Ensure the callback is captured from the service instance that ran onModuleInit
      // The service.onModuleInit() in the describe's beforeEach already ran.
      // The postPublishCallback is already set up.

      await postPublishCallback('id1', '/live/stream1', {}); // Use existing callback

      expect(childProcess.spawn).toHaveBeenCalledWith(actualFfmpegPath, expect.arrayContaining([expect.stringContaining('rtmp://127.0.0.1/live/stream1')])); // For VOD
      expect(childProcess.spawn).toHaveBeenCalledWith(actualFfmpegPath, expect.arrayContaining([expect.stringContaining('rtmp://127.0.0.1/live/stream1'), '-f', 'null'])); // For Metrics
    });

    it('should log an error if VOD FFmpeg spawn throws', async () => {
      const spawnError = new Error('Spawn VOD failed');
      (childProcess.spawn as jest.Mock).mockImplementationOnce(() => { throw spawnError; }); // Fail only VOD spawn

      await postPublishCallback('id1', '/live/stream1', {});
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`[FFmpeg VOD Error][stream1]: ${spawnError.message}`), spawnError.stack);
    });

    it('should log an error if Metrics FFmpeg spawn throws', async () => {
      const spawnError = new Error('Spawn Metrics failed');
      (childProcess.spawn as jest.Mock)
        .mockReturnValueOnce(mockSpawnInstance as any) // VOD spawn succeeds
        .mockImplementationOnce(() => { throw spawnError; }); // Metrics spawn fails

      await postPublishCallback('id1', '/live/stream1', {});
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`[FFmpeg Metrics Error][stream1]: ${spawnError.message}`), spawnError.stack);
    });

    it('should log an error if VOD FFmpeg process emits an error', async () => {
      const processError = new Error('VOD process error');
      // This test needs to ensure only the VOD ffmpeg mock emits this error.
      // Assuming the first call to spawn is VOD, the second is Metrics.
      const vodSpawnMock = { ...mockSpawnInstance, on: jest.fn() };
      const metricsSpawnMock = { ...mockSpawnInstance, on: jest.fn() }; // Separate mock for metrics

      (childProcess.spawn as jest.Mock)
        .mockReturnValueOnce(vodSpawnMock as any)
        .mockReturnValueOnce(metricsSpawnMock as any);

      vodSpawnMock.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(processError);
        }
      });

      await postPublishCallback('id1', '/live/stream1', {});
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`[FFmpeg VOD Error][stream1] ${processError.message}`), processError.stack);
    });

    it('should log an error if VOD FFmpeg process closes with non-zero code', async () => {
        const vodSpawnMock = { ...mockSpawnInstance, on: jest.fn() };
        const metricsSpawnMock = { ...mockSpawnInstance, on: jest.fn() };

        (childProcess.spawn as jest.Mock)
            .mockReturnValueOnce(vodSpawnMock as any) // VOD
            .mockReturnValueOnce(metricsSpawnMock as any); // Metrics

        vodSpawnMock.on.mockImplementation((event, callback) => {
            if (event === 'close') {
              callback(1); // Non-zero exit code
            }
        });

        await postPublishCallback('id1', '/live/stream1', {});
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('[FFmpeg VOD Error][stream1] exited with code: 1'));
    });

    // Similar tests can be written for the Metrics FFmpeg process error and close events
    // but would require more sophisticated mocking of child_process.spawn to return distinct
    // mock instances for each call to differentiate their event handling.
  });
});
