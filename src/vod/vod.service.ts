// src/vod/vod.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VodService {
  private vodRoot = path.resolve(__dirname, '../../media/vod');

  constructor() {
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
    return fs.readdirSync(this.vodRoot);
  }

  getVodFilePath(filename: string): string {
    return path.join(this.vodRoot, filename);
  }
}
