// src/vod/vod.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { VodService } from './vod.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Mock the 'fs' module
jest.mock('fs');
// Mock the Logger
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

describe('VodService', () => {
  let service: VodService;
  let configService: ConfigService;
  let mockLogger: Logger;

  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VodService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'MEDIA_ROOT') return defaultValue || './media';
              if (key === 'VOD_DIRECTORY_NAME') return defaultValue || 'vod';
              return defaultValue;
            }),
          },
        },
        // Logger is auto-mocked by jest.mock above
      ],
    }).compile();

    service = module.get<VodService>(VodService);
    configService = module.get<ConfigService>(ConfigService);
    // Get the mocked Logger instance if needed for assertions
    // For VodService, it's instantiated internally, so we use the static mock methods for assertions if needed
    // or spyOn the prototype if we need to check calls on an instance.
    // However, our current Logger mock setup makes the constructor return a mocked instance.
    // To assert calls on the logger used by the service instance:
    mockLogger = (service as any).logger; // Access the internal logger instance

    // Reset mocks before each test
    jest.clearAllMocks();
    (mockFs.existsSync as jest.Mock).mockReturnValue(true); // Default to dir exists
    (mockFs.mkdirSync as jest.Mock).mockClear();
    (mockFs.readdirSync as jest.Mock).mockClear();
  });

  describe('vodRoot initialization', () => {
    it('should initialize vodRoot with default values if none provided in config', () => {
      // Service is already initialized in beforeEach with default mock behavior
      const expectedPath = path.resolve('./media', 'vod');
      expect((service as any).vodRoot).toBe(expectedPath);
      expect(mockFs.existsSync).toHaveBeenCalledWith(expectedPath);
      // expect(mockFs.mkdirSync).not.toHaveBeenCalled(); // If existsSync is true
    });

    it('should initialize vodRoot with custom MEDIA_ROOT from config', () => {
      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'MEDIA_ROOT') return './custom_media';
        if (key === 'VOD_DIRECTORY_NAME') return 'vod';
        return defaultValue;
      });
      const newService = new VodService(configService); // Re-initialize with new config mock
      const expectedPath = path.resolve('./custom_media', 'vod');
      expect((newService as any).vodRoot).toBe(expectedPath);
    });

    it('should initialize vodRoot with custom VOD_DIRECTORY_NAME from config', () => {
      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'MEDIA_ROOT') return './media';
        if (key === 'VOD_DIRECTORY_NAME') return 'custom_vod';
        return defaultValue;
      });
      const newService = new VodService(configService);
      const expectedPath = path.resolve('./media', 'custom_vod');
      expect((newService as any).vodRoot).toBe(expectedPath);
    });

    it('should create vodRoot directory if it does not exist', () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(false);
      const newService = new VodService(configService); // Re-initialize
      const expectedPath = path.resolve('./media', 'vod');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
    });
  });

  describe('generateVodPath', () => {
    it('should generate a VOD path with correct structure and timestamp', () => {
      const streamKey = 'testStreamKey';
      const dateNow = new Date('2023-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => dateNow as any);

      const vodPath = service.generateVodPath(streamKey);
      const expectedTimestamp = '2023-01-01T12-00-00-000Z';
      const expectedFilename = `${streamKey}-${expectedTimestamp}.mp4`;
      const expectedFullPath = path.join(path.resolve('./media', 'vod'), expectedFilename);

      expect(vodPath).toBe(expectedFullPath);
      (global.Date as any).mockRestore();
    });
  });

  describe('getVodFilePath', () => {
    const vodRoot = path.resolve('./media', 'vod');

    it('should return the correct path for a valid filename', () => {
      const filename = 'validfile.mp4';
      const expectedPath = path.join(vodRoot, filename);
      expect(service.getVodFilePath(filename)).toBe(expectedPath);
    });

    it('should return null and log a warning for path traversal attempt with ..', () => {
      const filename = '../outside.mp4';
      expect(service.getVodFilePath(filename)).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid characters or path traversal components'));
    });

    it('should return null and log a warning for path traversal attempt with /', () => {
      const filename = 'sub/dir/file.mp4';
      expect(service.getVodFilePath(filename)).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid characters or path traversal components'));
    });

    it('should return null and log a warning for filename with null byte', () => {
      const filename = 'file\0name.mp4';
      expect(service.getVodFilePath(filename)).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid characters or path traversal components'));
    });

    it('should return null and log a warning if resolved path is outside VOD root', () => {
        // This specific scenario (path.join + path.resolve resulting in outside root without '..' in input)
        // is hard to test without a more complex mock of path.resolve or by actually creating directory structure.
        // The primary check for '..' and '/' in filename already covers most direct attempts.
        // Here, we rely on the existing string-based check for '..' and '/'
        const filename = 'attempt_outside.mp4';
        const originalPathResolve = path.resolve;
        jest.spyOn(path, 'resolve').mockImplementation((pathSegment) => {
            if (pathSegment === path.join((service as any).vodRoot, filename)) {
                return path.resolve((service as any).vodRoot, '..', filename); // Simulate resolving outside
            }
            return originalPathResolve(pathSegment);
        });

        expect(service.getVodFilePath(filename)).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Path traversal attempt or invalid file access'));
        jest.spyOn(path, 'resolve').mockRestore();
    });

    it('should return null if resolved path is the VOD root itself', () => {
      // This case is tricky because path.join(vodRoot, '') is vodRoot.
      // A filename that resolves to the VOD root itself.
      // Our current implementation of getVodFilePath has `!resolvedRequestedPath.startsWith(resolvedVodRoot + path.sep) || resolvedRequestedPath === resolvedVodRoot`
      // If filename is empty string, path.join makes it vodRoot. resolvedRequestedPath becomes resolvedVodRoot.
      // This condition will be true.
      const filename = '';
      // path.join will return vodRoot. path.resolve will return absolute of vodRoot.
      // The check `resolvedRequestedPath === resolvedVodRoot` should catch this.
      expect(service.getVodFilePath(filename)).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Path traversal attempt or invalid file access for VOD: Filename '${filename}' resolved to '${(service as any).vodRoot}', which is outside the VOD root '${(service as any).vodRoot}' or is the root itself.`)
      );
    });
  });

  describe('listVodFiles', () => {
    it('should return a list of files on successful readdirSync', () => {
      const files = ['file1.mp4', 'file2.mp4'];
      (mockFs.readdirSync as jest.Mock).mockReturnValue(files);
      expect(service.listVodFiles()).toEqual(files);
    });

    it('should return an empty array and log an error if readdirSync throws', () => {
      const error = new Error('Test readdirSync error');
      (mockFs.readdirSync as jest.Mock).mockImplementation(() => {
        throw error;
      });
      expect(service.listVodFiles()).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error reading VOD directory'), error.stack);
    });
  });
});
