// src/stream/stream.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { StreamService } from './stream.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { MetricService } from '../metrics/metric.service';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: jest.fn(() => 'teststreamkey123') })),
}));

describe('StreamService', () => {
  let service: StreamService;
  let configService: ConfigService;
  let userRepository: Repository<User>;
  let metricService: MetricService;

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMetricService = {
    getMetrics: jest.fn(),
    resetMetrics: jest.fn(),
    updateMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'RTMP_BASE_URL') return defaultValue || 'rtmp://localhost:1935';
              if (key === 'HLS_BASE_URL') return defaultValue || 'http://localhost:8000';
              return defaultValue;
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: MetricService,
          useValue: mockMetricService,
        },
      ],
    }).compile();

    service = module.get<StreamService>(StreamService);
    configService = module.get<ConfigService>(ConfigService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    metricService = module.get<MetricService>(MetricService);

    jest.clearAllMocks();
  });

  describe('URL and Key Generation', () => {
    it('should use RTMP_BASE_URL and HLS_BASE_URL from ConfigService for generated URLs in getOrCreateStreamKey when user is new', async () => {
      const clerkId = 'clerk_new_user';
      const testRtmpBaseUrl = 'rtmp://custom-rtmp.com:1935';
      const testHlsBaseUrl = 'https://custom-hls.com';
      const generatedStreamKey = 'teststreamkey123';

      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'RTMP_BASE_URL') return testRtmpBaseUrl;
        if (key === 'HLS_BASE_URL') return testHlsBaseUrl;
        return null;
      });
       // Re-initialize service to pick up new config mock values for its internal properties
      const newService = new StreamService(userRepository, configService, metricService);


      mockUserRepo.findOne.mockResolvedValue(null); // New user
      mockUserRepo.create.mockImplementation(dto => ({ ...dto, streamKey: generatedStreamKey } as User));
      mockUserRepo.save.mockImplementation(user => Promise.resolve(user as User));


      const result = await newService.getOrCreateStreamKey(clerkId);

      expect(randomBytes).toHaveBeenCalledWith(16);
      expect(result.streamKey).toBe(generatedStreamKey);
      expect(result.streamUrl).toBe(`${testRtmpBaseUrl}/live/${generatedStreamKey}`);
      expect(result.hlsUrl).toBe(`${testHlsBaseUrl}/live/${generatedStreamKey}/index.m3u8`);
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clerkId,
          streamKey: generatedStreamKey,
          streamUrl: `${testRtmpBaseUrl}/live/${generatedStreamKey}`,
          // hlsUrl is not stored in User entity, but generated on the fly
        }),
      );
    });

    it('should use RTMP_BASE_URL and HLS_BASE_URL from ConfigService for generated HLS URL when user exists in getOrCreateStreamKey', async () => {
      const clerkId = 'clerk_existing_user';
      const existingUser = {
        clerkId,
        streamKey: 'existingkey456',
        streamUrl: 'rtmp://default-rtmp/live/existingkey456',
        // other user fields
      } as User;
      const testHlsBaseUrl = 'https://custom-hls.com:8001';

      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'RTMP_BASE_URL') return 'rtmp://some-rtmp-url'; // Should not be used for streamUrl if user exists
        if (key === 'HLS_BASE_URL') return testHlsBaseUrl;
        return defaultValue;
      });
      const newService = new StreamService(userRepository, configService, metricService);


      mockUserRepo.findOne.mockResolvedValue(existingUser);

      const result = await newService.getOrCreateStreamKey(clerkId);

      expect(result.streamKey).toBe(existingUser.streamKey);
      expect(result.streamUrl).toBe(existingUser.streamUrl); // existing streamUrl should be returned
      expect(result.hlsUrl).toBe(`${testHlsBaseUrl}/live/${existingUser.streamKey}/index.m3u8`); // hlsUrl should be newly generated
    });


    it('should use RTMP_BASE_URL and HLS_BASE_URL from ConfigService for generated URLs in deleteStreamKey', async () => {
      const clerkId = 'clerk_user_for_delete';
      const oldStreamKey = 'oldstreamkey789';
      const newGeneratedStreamKey = 'teststreamkey123'; // from crypto mock
      const testRtmpBaseUrl = 'rtmp://another-rtmp.net';
      const testHlsBaseUrl = 'http://another-hls.net';

      const existingUser = {
        clerkId,
        streamKey: oldStreamKey,
        streamUrl: `rtmp://localhost:1935/live/${oldStreamKey}`,
        isStreaming: true, // Will be set to false
      } as User;

      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'RTMP_BASE_URL') return testRtmpBaseUrl;
        if (key === 'HLS_BASE_URL') return testHlsBaseUrl;
        return null;
      });
      const newService = new StreamService(userRepository, configService, metricService);

      mockUserRepo.findOne.mockResolvedValue(existingUser);
      mockUserRepo.save.mockImplementation(user => Promise.resolve(user as User));

      const result = await newService.deleteStreamKey(clerkId, oldStreamKey);

      expect(randomBytes).toHaveBeenCalledWith(16);
      expect(result.newStreamKey).toBe(newGeneratedStreamKey);
      expect(result.newStreamUrl).toBe(`${testRtmpBaseUrl}/live/${newGeneratedStreamKey}`);
      expect(result.hlsUrl).toBe(`${testHlsBaseUrl}/live/${newGeneratedStreamKey}/index.m3u8`);

      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          clerkId,
          streamKey: newGeneratedStreamKey,
          streamUrl: `${testRtmpBaseUrl}/live/${newGeneratedStreamKey}`,
          isStreaming: false,
        }),
      );
    });
  });

  // Other tests for StreamService methods (startStream, stopStream, etc.)
  // would go here, focusing on their interaction with the repository and other services.
  // For this subtask, the focus was on URL generation based on ConfigService.
});
