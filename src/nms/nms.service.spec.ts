// src/nms/nms.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NmsService } from './nms.service';
import { ConfigService } from '@nestjs/config';
import { MetricService } from '../metrics/metric.service';
import { VodService } from '../vod/vod.service';
import { Logger } from '@nestjs/common';
import * as childProcess from 'child_process';
import NodeMediaServer from 'node-media-server';

// Mock NodeMediaServer
jest.mock('node-media-server');
const mockNmsInstance = {
  on: jest.fn(),
  run: jest.fn(),
};
(NodeMediaServer as jest.Mock).mockImplementation(() => mockNmsInstance);

// Mock child_process
jest.mock('child_process');
const mockSpawnInstance = {
  on: jest.fn(),
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
};
(childProcess.spawn as jest.Mock).mockReturnValue(mockSpawnInstance as any);


// Mock Logger
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));


describe('NmsService', () => {
  let service: NmsService;
  let configService: ConfigService;
  let metricService: MetricService;
  let vodService: VodService;
  let mockLogger: Logger;


  const mockMetricService = {
    resetMetrics: jest.fn(),
    updateMetrics: jest.fn(),
  };

  const mockVodService = {
    generateVodPath: jest.fn().mockReturnValue('/test/vod/output/path.mp4'),
  };

  beforeEach(async () => {
    // Reset mocks for NMS instance and spawn before each test module compilation
    mockNmsInstance.on.mockClear();
    mockNmsInstance.run.mockClear();
    (NodeMediaServer as jest.Mock).mockClear();
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
        // Logger is auto-mocked
      ],
    }).compile();

    service = module.get<NmsService>(NmsService);
    configService = module.get<ConfigService>(ConfigService);
    metricService = module.get<MetricService>(MetricService);
    vodService = module.get<VodService>(VodService);
    mockLogger = (service as any).logger; // Access the internal logger instance

    jest.clearAllMocks(); // Clear all other mocks like logger calls
  });

  describe('onModuleInit - Configuration and Initialization', () => {
    it('should get FFMPEG_PATH and MEDIA_ROOT from ConfigService', () => {
      service.onModuleInit();
      expect(configService.get).toHaveBeenCalledWith('FFMPEG_PATH', 'ffmpeg');
      expect(configService.get).toHaveBeenCalledWith('MEDIA_ROOT', './media');
    });

    it('should construct NodeMediaServer with configured mediaroot', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'MEDIA_ROOT') return './custom_media_root';
        if (key === 'FFMPEG_PATH') return 'ffmpeg';
        return null;
      });
      // Re-initialize to pick up new config values for constructor pass-through
      const newService = new NmsService(metricService, vodService, configService);
      newService.onModuleInit();

      expect(NodeMediaServer).toHaveBeenCalledWith(
        expect.objectContaining({
          http: expect.objectContaining({ mediaroot: './custom_media_root' }),
          trans: expect.objectContaining({ ffmpeg: 'ffmpeg' }),
        }),
      );
    });

    it('should construct NodeMediaServer with configured ffmpeg path for transcode', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'MEDIA_ROOT') return './media';
        if (key === 'FFMPEG_PATH') return '/usr/local/bin/ffmpeg_custom';
        return null;
      });
      const newService = new NmsService(metricService, vodService, configService);
      newService.onModuleInit();

      expect(NodeMediaServer).toHaveBeenCalledWith(
        expect.objectContaining({
          trans: expect.objectContaining({ ffmpeg: '/usr/local/bin/ffmpeg_custom' }),
        }),
      );
    });

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

    it('should use configured ffmpegPath for VOD and Metrics spawn calls', async () => {
      const customFfmpegPath = '/path/to/my/ffmpeg';
      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'FFMPEG_PATH') return customFfmpegPath;
        return defaultValue;
      });
       // Re-initialize service for new config to be used in onModuleInit's scope
      const newNmsService = new NmsService(metricService, vodService, configService);
      newNmsService.onModuleInit();
      const newPostPublishCallback = mockNmsInstance.on.mock.calls.find(call => call[0] === 'postPublish')?.[1];


      await newPostPublishCallback?.('id1', '/live/stream1', {});

      expect(childProcess.spawn).toHaveBeenCalledWith(customFfmpegPath, expect.arrayContaining([expect.stringContaining('rtmp://127.0.0.1/live/stream1')])); // For VOD
      expect(childProcess.spawn).toHaveBeenCalledWith(customFfmpegPath, expect.arrayContaining([expect.stringContaining('rtmp://127.0.0.1/live/stream1'), '-f', 'null'])); // For Metrics
    });

    it('should log an error if VOD FFmpeg spawn throws', async () => {
      const spawnError = new Error('Spawn VOD failed');
      (childProcess.spawn as jest.Mock).mockImplementationOnce(() => { throw spawnError; }); // Fail only VOD spawn

      await postPublishCallback('id1', '/live/stream1', {});
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to spawn FFmpeg process for VOD'), spawnError.stack);
    });

    it('should log an error if Metrics FFmpeg spawn throws', async () => {
      const spawnError = new Error('Spawn Metrics failed');
      (childProcess.spawn as jest.Mock)
        .mockReturnValueOnce(mockSpawnInstance as any) // VOD spawn succeeds
        .mockImplementationOnce(() => { throw spawnError; }); // Metrics spawn fails

      await postPublishCallback('id1', '/live/stream1', {});
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to spawn FFmpeg process for metrics'), spawnError.stack);
    });

    it('should log an error if VOD FFmpeg process emits an error', async () => {
      const processError = new Error('VOD process error');
      (childProcess.spawn as jest.Mock).mockReturnValueOnce(mockSpawnInstance as any);

      // Simulate VOD process error
      mockSpawnInstance.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(processError);
        }
      });

      await postPublishCallback('id1', '/live/stream1', {});
      // This assertion depends on which spawn call's 'on' is being triggered.
      // Need to refine mockSpawnInstance or mock separate instances for VOD and Metrics.
      // For simplicity here, we assume the first spawn (VOD) is what we're testing.
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('[FFmpeg VOD Error][stream1] Failed to start or error during process'), processError.stack);
    });

    it('should log an error if VOD FFmpeg process closes with non-zero code', async () => {
        (childProcess.spawn as jest.Mock).mockReturnValueOnce(mockSpawnInstance as any); // VOD
        (childProcess.spawn as jest.Mock).mockReturnValueOnce(mockSpawnInstance as any); // Metrics (so it doesn't interfere)

        // Simulate VOD process 'close' with error code
        // We need to control the mock for the specific VOD spawn.
        // This is a limitation of the shared mockSpawnInstance.
        // A more robust way is to have spawn return different mocks.
        const specificVodSpawnMock = { ...mockSpawnInstance, on: jest.fn() };
        (childProcess.spawn as jest.Mock).mockImplementationOnce(() => specificVodSpawnMock as any);


        specificVodSpawnMock.on.mockImplementation((event, callback) => {
            if (event === 'close') {
              callback(1); // Non-zero exit code
            }
        });

        await postPublishCallback('id1', '/live/stream1', {});
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('[FFmpeg VOD Error][stream1] Recording process exited with code: 1'));
    });

    // Similar tests can be written for the Metrics FFmpeg process error and close events
    // but would require more sophisticated mocking of child_process.spawn to return distinct
    // mock instances for each call to differentiate their event handling.
  });
});
