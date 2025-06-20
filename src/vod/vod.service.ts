import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VodService {
  private readonly vodRoot: string;
  private readonly logger = new Logger(VodService.name);

  constructor(private readonly configService: ConfigService) {
    const mediaRoot = this.configService.get<string>('MEDIA_ROOT', './media');
    const vodDirectoryName = this.configService.get<string>('VOD_DIRECTORY_NAME', 'vod');
    this.vodRoot = path.resolve(mediaRoot, vodDirectoryName);

    // Ensure the directory exists
    try {
      if (!fs.existsSync(this.vodRoot)) {
        fs.mkdirSync(this.vodRoot, { recursive: true });
        this.logger.log(`Created VOD directory: ${this.vodRoot}`);
      }
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const e = error as Error;
        this.logger.error(`Failed to create VOD directory '${this.vodRoot}': ${e.message}`, e.stack);
      } else {
        this.logger.error(`Failed to create VOD directory '${this.vodRoot}': ${String(error)}`);
      }
    }
  }

  generateVodPath(streamKey: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${streamKey}-${timestamp}.mp4`;
    return path.join(this.vodRoot, filename);
  }

  listVodFiles(): string[] {
    try {
      return fs.readdirSync(this.vodRoot);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const e = error as Error;
        this.logger.error(`Error reading VOD directory '${this.vodRoot}': ${e.message}`, e.stack);
      } else {
        this.logger.error(`Error reading VOD directory '${this.vodRoot}': ${String(error)}`);
      }
      return [];
    }
  }

  getVodFilePath(filename: string): string | null {
    // Disallow potentially dangerous characters and path traversal
    if (filename.includes('\0') || filename.includes('/') || filename.includes('..')) {
      this.logger.warn(`Invalid characters or path traversal in VOD filename: '${filename}'`);
      return null;
    }

    const requestedPath = path.join(this.vodRoot, filename);
    const resolvedRequestedPath = path.resolve(requestedPath);
    const resolvedVodRoot = path.resolve(this.vodRoot);

    // Prevent accessing outside the VOD directory
    if (
      !resolvedRequestedPath.startsWith(resolvedVodRoot + path.sep) ||
      resolvedRequestedPath === resolvedVodRoot
    ) {
      this.logger.warn(
        `Path traversal or invalid file access: '${filename}' resolved to '${resolvedRequestedPath}', which is not within '${resolvedVodRoot}'`,
      );
      return null;
    }

    return resolvedRequestedPath;
  }
}
