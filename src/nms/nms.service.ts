import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import NodeMediaServer from 'node-media-server';
import { MetricService } from '../metrics/metric.service';
import { VodService } from '../vod/vod.service';
import { spawn } from 'child_process';
import * as fs from 'fs';

@Injectable()
export class NmsService implements OnModuleInit {
  private nms!: NodeMediaServer;
  private readonly logger = new Logger(NmsService.name);

  constructor(
    private readonly metricService: MetricService,
    private readonly vodService: VodService,
  ) {}

  onModuleInit() {
    const isWindows = process.platform === 'win32';

    // Hardcoded FFmpeg binary path (update according to your actual locations)
    let ffmpegPath = isWindows
      ? 'C:/ffmpeg/bin/ffmpeg.exe' // Windows path
      : '/usr/bin/ffmpeg';         // Linux path

    // Normalize path slashes for Windows
    if (isWindows && ffmpegPath.includes('\\')) {
      ffmpegPath = ffmpegPath.replace(/\\/g, '/');
    }

    if (!fs.existsSync(ffmpegPath)) {
      this.logger.error(`FFmpeg binary not found at: ${ffmpegPath}`);
      process.exit(1);
    }

    const mediaRoot = './media';

    const config = {
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        mediaroot: mediaRoot,
        port: 8000,
        allow_origin: '*',
      },
      trans: {
        ffmpeg: ffmpegPath,
        tasks: [
          {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=10:hls_list_size=6:hls_flags=delete_segments]',
            dash: false,
          },
        ],
      },
    };

    this.nms = new NodeMediaServer(config);
    this.setupStreamEvents(ffmpegPath);
    this.nms.run();
  }

  private setupStreamEvents(ffmpegPath: string) {
    this.nms.on('postPublish', async (id, streamPath) => {
      const streamKey = streamPath.split('/').pop() || 'defaultStreamKey';
      this.logger.log(`[NodeEvent] Stream started for ${streamKey}`);

      const vodOutputPath = this.vodService.generateVodPath(streamKey);

      try {
        const ffmpeg = spawn(ffmpegPath, [
          '-i', `rtmp://127.0.0.1/live/${streamKey}`,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-y',
          vodOutputPath,
        ]);

        ffmpeg.stderr.on('data', (data: Buffer) => {
          this.logger.verbose(`[FFmpeg VOD Stderr][${streamKey}] ${data.toString().trim()}`);
        });

        ffmpeg.on('error', (err) => {
          this.logger.error(`[FFmpeg VOD Error][${streamKey}] ${err.message}`, err.stack);
        });

        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            this.logger.error(`[FFmpeg VOD Error][${streamKey}] exited with code: ${code}`);
          } else {
            this.logger.log(`[FFmpeg VOD][${streamKey}] completed successfully.`);
          }
          this.metricService.resetMetrics(streamKey);
        });
      } catch (error: unknown) {
        this.logUnknownError(`[FFmpeg VOD Error][${streamKey}]`, error);
      }

      // === Metrics ===
      let lastTotalSize = 0;
      let lastTimestamp = Date.now();
      let lastTime = Date.now();
      let dataChunksProcessed = 0;

      try {
        const metricsFfmpeg = spawn(ffmpegPath, [
          '-i', `rtmp://127.0.0.1/live/${streamKey}`,
          '-f', 'null',
          '-',
          '-stats',
          '-progress', 'pipe:1',
        ]);

        metricsFfmpeg.on('error', (err) => {
          this.logger.error(`[FFmpeg Metrics Error][${streamKey}] ${err.message}`, err.stack);
        });

        metricsFfmpeg.stdout.on('data', (data: Buffer) => {
          const lines = data.toString().split('\n');
          let totalSize = lastTotalSize;

          for (const line of lines) {
            const [key, valueRaw] = line.trim().split('=');
            const value = valueRaw ?? '0';
            if (key === 'total_size') totalSize = parseInt(value, 10);
          }

          const now = Date.now();
          const deltaBytes = totalSize - lastTotalSize;
          const durationSec = (now - lastTimestamp) / 1000;
          dataChunksProcessed++;

          if (durationSec <= 0) {
            this.logger.verbose(`[FFmpeg Metrics][${streamKey}] Skipping short interval.`);
            lastTimestamp = now;
            return;
          }

          const bitrate = (deltaBytes * 8) / 1024 / durationSec;
          const latency = now - lastTime;
          const bandwidth = bitrate * 1.2;

          lastTotalSize = totalSize;
          lastTimestamp = now;
          lastTime = now;

          if (dataChunksProcessed < 3) {
            this.logger.verbose(`[FFmpeg Metrics][${streamKey}] Stabilizing...`);
            return;
          }

          this.metricService.updateMetrics(streamKey, {
            bitrate: Math.round(bitrate),
            latency,
            bandwidth: Number(bandwidth.toFixed(2)),
          });
        });

        metricsFfmpeg.stderr.on('data', (data: Buffer) => {
          this.logger.warn(`[FFmpeg Metrics Stderr][${streamKey}] ${data.toString().trim()}`);
        });

        metricsFfmpeg.on('close', (code) => {
          if (code !== 0) {
            this.logger.error(`[FFmpeg Metrics Error][${streamKey}] exited with code: ${code}`);
          } else {
            this.logger.log(`[FFmpeg Metrics][${streamKey}] completed.`);
          }
        });
      } catch (error: unknown) {
        this.logUnknownError(`[FFmpeg Metrics Error][${streamKey}]`, error);
      }
    });

    this.nms.on('donePublish', (id, streamPath) => {
      const streamKey = streamPath.split('/').pop() || 'defaultStreamKey';
      this.logger.log(`[NodeEvent][${streamKey}] Stream publishing finished.`);
    });

    this.nms.on('error', (err: unknown) => {
      const message = `[NodeMediaServer Global Error]`;
      if (err instanceof Error) {
        this.logger.error(`${message}: ${err.message}`, err.stack);
      } else {
        this.logger.error(`${message}: ${String(err)}`);
      }
    });
  }

  private logUnknownError(prefix: string, error: unknown) {
    if (error instanceof Error) {
      this.logger.error(`${prefix}: ${error.message}`, error.stack);
    } else {
      this.logger.error(`${prefix}: ${String(error)}`);
    }
  }
}
