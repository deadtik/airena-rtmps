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
      // Gracefully handle errors if the VOD directory is inaccessible (e.g., permissions, not found).
      // Returning an empty array to prevent 500 errors on listing when the directory is problematic.
      this.logger.error(`Error reading VOD directory '${this.vodRoot}': ${error.message}`, error.stack);
      return [];
    }
  }

  getVodFilePath(filename: string): string | null {
    // Initial basic sanitization:
    // Disallow null bytes, forward slashes, and double dots (path traversal indicators) in the filename.
    // This is a first line of defense. More robust sanitization might involve allow-lists for characters.
    if (filename.includes('\0') || filename.includes('/') || filename.includes('..')) {
      this.logger.warn(`Invalid characters or path traversal components found in VOD filename: '${filename}'`);
      return null;
    }

    // Construct the full path to the requested file.
    const requestedPath = path.join(this.vodRoot, filename);
    // Resolve the path to its absolute form to normalize it (e.g., remove '..').
    const resolvedRequestedPath = path.resolve(requestedPath);
    const resolvedVodRoot = path.resolve(this.vodRoot);

    // Path Traversal Security Check:
    // Ensure that the fully resolved path of the requested file:
    // 1. Starts with the resolved VOD root directory path + path separator (e.g., '/var/www/media/vod/').
    //    This ensures the file is *within* the VOD root.
    // 2. Is not the VOD root directory itself (to prevent listing/accessing the root as a file).
    if (!resolvedRequestedPath.startsWith(resolvedVodRoot + path.sep) ||
        resolvedRequestedPath === resolvedVodRoot) {
      this.logger.warn(`Path traversal attempt or invalid file access for VOD: Filename '${filename}' resolved to '${resolvedRequestedPath}', which is outside the VOD root '${resolvedVodRoot}' or is the root itself.`);
      return null;
    }

    // If all checks pass, return the resolved, absolute path to the file.
    return resolvedRequestedPath;
  }
}
