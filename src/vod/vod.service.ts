// src/vod/vod.service.ts
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
    if (!fs.existsSync(this.vodRoot)) {
      fs.mkdirSync(this.vodRoot, { recursive: true });
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
      if (error instanceof Error) {
        this.logger.error(
          `Error reading VOD directory '${this.vodRoot}': ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Unknown error reading VOD directory '${this.vodRoot}'`,
          JSON.stringify(error),
        );
      }
      return [];
    }
  }

  getVodFilePath(filename: string): string | null {
    // Basic sanitization
    if (filename.includes('\0') || filename.includes('/') || filename.includes('..')) {
      this.logger.warn(
        `Invalid characters or path traversal components found in VOD filename: '${filename}'`,
      );
      return null;
    }

    const requestedPath = path.join(this.vodRoot, filename);
    const resolvedRequestedPath = path.resolve(requestedPath);
    const resolvedVodRoot = path.resolve(this.vodRoot);

    // Security check: ensure file is within VOD root
    if (
      !resolvedRequestedPath.startsWith(resolvedVodRoot + path.sep) ||
      resolvedRequestedPath === resolvedVodRoot
    ) {
      this.logger.warn(
        `Path traversal attempt or invalid file access for VOD: Filename '${filename}' resolved to '${resolvedRequestedPath}', which is outside the VOD root '${resolvedVodRoot}' or is the root itself.`,
      );
      return null;
    }

    return resolvedRequestedPath;
  }
}
