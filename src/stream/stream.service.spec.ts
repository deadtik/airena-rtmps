// src/stream/stream.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { StreamService } from './stream.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { MetricService } from '../metrics/metric.service';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common'; // Import NotFoundException
// import { randomBytes, createHash } from 'crypto'; // No longer directly importing from crypto

// Highly specific Crypto Mock for NestJS internals
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto, // Fallback for other crypto functions
    createHash: jest.fn((algorithm: string) => {
      // console.log(`Crypto mock: createHash called with ${algorithm}`);
      if (algorithm && algorithm.toLowerCase() === 'md5') {
        return {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn((encoding: string) => {
            // console.log(`Crypto mock: digest called with ${encoding}`);
            if (encoding && encoding.toLowerCase() === 'hex') {
              return 'mocked_md5_hex_hash_for_nestjs_di';
            }
            // Fallback for other encodings if NestJS uses them
            return 'mocked_md5_other_encoding_hash';
          }),
        };
      }
      // Fallback for other algorithms - this might be risky if actualCrypto itself has issues in Jest
      // For robust testing, explicitly mock any other algorithm NestJS might use.
      // If this part errors, it means NestJS is using another algorithm.
      return actualCrypto.createHash(algorithm);
    }),
    // StreamService uses randomBytes directly
    randomBytes: jest.fn((size: number) => {
      if (size === 16) { // Specifically for stream keys
        return {
          toString: jest.fn((encoding: string) => {
            if (encoding === 'hex') {
              return 'fixed_test_stream_key_hex'; // Consistent key for tests
            }
            return `mocked_random_${size}_${encoding}`;
          }),
        };
      }
      // Fallback for other sizes if any
      return {
        toString: jest.fn((encoding: string) => `mocked_random_${size}_${encoding}`),
      };
    })
  };
});

// Mock concrete implementations for dependencies
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    if (key === 'RTMP_BASE_URL') return defaultValue || 'rtmp://localhost:1935';
    if (key === 'HLS_BASE_URL') return defaultValue || 'http://localhost:8000';
    return defaultValue;
  }),
};

const mockUserRepository: Partial<Repository<User>> = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockMetricService = {
  getMetrics: jest.fn(),
  resetMetrics: jest.fn(),
  updateMetrics: jest.fn(),
};


describe('StreamService', () => { // Renamed describe block
  let service: StreamService;
  // let configService: ConfigService; // This line caused TS error, removed. Use mockConfigService directly for mock setups.
  let userRepository: Partial<Repository<User>>;

  beforeEach(async () => {
    // Reset all mocks before each test for a clean slate
    mockConfigService.get.mockClear();
    (mockUserRepository.findOne as jest.Mock).mockClear();
    (mockUserRepository.save as jest.Mock).mockClear();
    (mockUserRepository.create as jest.Mock).mockClear();
    (mockMetricService.getMetrics as jest.Mock)?.mockClear();
    (mockMetricService.resetMetrics as jest.Mock)?.mockClear();
    (mockMetricService.updateMetrics as jest.Mock)?.mockClear();

    // Also clear the crypto mocks if they are jest.fn based at the top level
    const crypto = require('crypto');
    if (jest.isMockFunction(crypto.createHash)) {
        crypto.createHash.mockClear();
    }
    if (jest.isMockFunction(crypto.randomBytes)) {
        (crypto.randomBytes(16).toString as jest.Mock).mockClear(); // Clear specific mock call
        crypto.randomBytes.mockClear();
    }

    userRepository = mockUserRepository; // Assign for direct use if needed in tests
    // configService = mockConfigService; // Removed assignment to typed variable


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamService,
        { provide: ConfigService, useValue: mockConfigService }, // Use the mock object directly
        { provide: getRepositoryToken(User), useValue: userRepository }, // Use assigned mock
        { provide: MetricService, useValue: mockMetricService },
      ],
    }).compile();

    try {
      service = module.get<StreamService>(StreamService);
    } catch (e) {
      console.error('Error during module.get<StreamService> in beforeEach:', e);
      throw e;
    }
  });

<<<<<<< HEAD
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
=======
  describe('URL and Key Generation', () => {
    it('should use RTMP_BASE_URL and HLS_BASE_URL from ConfigService for generated URLs in getOrCreateStreamKey when user is new', async () => {
      const clerkId = 'clerk_new_user';
      const testRtmpBaseUrl = 'rtmp://custom-rtmp.com:1935';
      const testHlsBaseUrl = 'https://custom-hls.com';
      const generatedStreamKey = 'teststreamkey123';
>>>>>>> 96bb04a23eef9507c65e7e6bad3438844a16b6e1

  describe('getOrCreateStreamKey', () => {
    const firebaseId = 'test-firebase-id';
    const defaultStreamSettings = {
      quality: 'high',
      maxBitrate: 6000,
      resolution: '1920x1080',
    };

    it('should create a new user with default settings if user does not exist', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockImplementation(dto => ({...dto})); // Simple pass-through
      (userRepository.save as jest.Mock).mockImplementation(user => Promise.resolve(user));

      // No need to mock crypto.randomBytes per test, it's handled by the global mock now
      // const mockCrypto = require('crypto');
      // (mockCrypto.randomBytes(16).toString as jest.Mock).mockReturnValue('newStreamKey123');

      const result = await service.getOrCreateStreamKey(firebaseId);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { firebaseId } });
      expect(userRepository.create).toHaveBeenCalledWith({
        firebaseId,
        streamKey: 'fixed_test_stream_key_hex', // Expect consistent key
        streamUrl: 'rtmp://localhost:1935/live/fixed_test_stream_key_hex',
        isStreaming: false,
        streamSettings: defaultStreamSettings,
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        streamKey: 'fixed_test_stream_key_hex', // Expect consistent key
        streamUrl: 'rtmp://localhost:1935/live/fixed_test_stream_key_hex',
        hlsUrl: 'http://localhost:8000/live/fixed_test_stream_key_hex/index.m3u8',
        isStreaming: false,
        streamSettings: defaultStreamSettings,
      });
<<<<<<< HEAD
    });

    it('should return existing user data including isStreaming and streamSettings if user exists', async () => {
      const existingUserSettings = { quality: 'low', maxBitrate: 1000, resolution: '640x360' };
      const existingUser = {
        firebaseId,
        streamKey: 'existingKey456',
        streamUrl: 'rtmp://localhost:1935/live/existingKey456',
        isStreaming: true,
        streamSettings: existingUserSettings,
      };
      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);
=======
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
>>>>>>> 96bb04a23eef9507c65e7e6bad3438844a16b6e1

      const result = await service.getOrCreateStreamKey(firebaseId);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { firebaseId } });
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        streamKey: 'existingKey456',
        streamUrl: 'rtmp://localhost:1935/live/existingKey456',
        hlsUrl: 'http://localhost:8000/live/existingKey456/index.m3u8',
        isStreaming: true,
        streamSettings: existingUserSettings,
      });
<<<<<<< HEAD
=======
      const newService = new StreamService(userRepository, configService, metricService);


      mockUserRepo.findOne.mockResolvedValue(existingUser);

      const result = await newService.getOrCreateStreamKey(clerkId);

      expect(result.streamKey).toBe(existingUser.streamKey);
      expect(result.streamUrl).toBe(existingUser.streamUrl); // existing streamUrl should be returned
      expect(result.hlsUrl).toBe(`${testHlsBaseUrl}/live/${existingUser.streamKey}/index.m3u8`); // hlsUrl should be newly generated
>>>>>>> 96bb04a23eef9507c65e7e6bad3438844a16b6e1
    });
  });

  describe('regenerateStreamKey', () => {
    const firebaseId = 'test-firebase-id-regen';

<<<<<<< HEAD
    it('should regenerate stream key for an existing user and set isStreaming to false', async () => {
      const existingUser = {
        firebaseId,
        streamKey: 'oldKey789',
        streamUrl: 'rtmp://localhost:1935/live/oldKey789',
=======
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
>>>>>>> 96bb04a23eef9507c65e7e6bad3438844a16b6e1
        isStreaming: true, // Will be set to false
        streamSettings: { quality: 'auto' },
      };
      (userRepository.findOne as jest.Mock).mockResolvedValue(existingUser);
      (userRepository.save as jest.Mock).mockImplementation(user => Promise.resolve(user)); // Save returns the saved entity

      // No need to mock crypto.randomBytes per test
      // const mockCrypto = require('crypto');
      // (mockCrypto.randomBytes(16).toString as jest.Mock).mockReturnValue('newRegenKeyABC');


      const result = await service.regenerateStreamKey(firebaseId);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { firebaseId } });
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        firebaseId,
        streamKey: 'fixed_test_stream_key_hex', // Expect consistent key
        streamUrl: 'rtmp://localhost:1935/live/fixed_test_stream_key_hex',
        isStreaming: false, // Crucial check
      }));
      expect(result).toEqual({
        streamKey: 'fixed_test_stream_key_hex', // Expect consistent key
        streamUrl: 'rtmp://localhost:1935/live/fixed_test_stream_key_hex',
        hlsUrl: 'http://localhost:8000/live/fixed_test_stream_key_hex/index.m3u8',
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

<<<<<<< HEAD
      await expect(service.regenerateStreamKey(firebaseId))
        .rejects
        .toThrow(new NotFoundException(`User with firebaseId ${firebaseId} not found.`));
      expect(userRepository.save).not.toHaveBeenCalled();
=======
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
>>>>>>> 96bb04a23eef9507c65e7e6bad3438844a16b6e1
    });
  });
});
