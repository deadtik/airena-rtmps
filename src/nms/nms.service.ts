import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import NodeMediaServer from 'node-media-server';
import { MetricService } from '../metrics/metric.service';
import { VodService } from '../vod/vod.service';
import { spawn } from 'child_process';

@Injectable()
export class NmsService implements OnModuleInit {
  private nms!: NodeMediaServer;
  private readonly logger = new Logger(NmsService.name);

  constructor(
    private readonly metricService: MetricService,
    private readonly vodService: VodService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    const mediaRoot = this.configService.get<string>('MEDIA_ROOT', './media');

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

    this.nms.on('postPublish', async (id, streamPath, args) => {
      const streamKey = streamPath.split('/').pop() || 'defaultStreamKey';
      this.logger.log(`[NodeEvent][${streamKey}] Stream started`);

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
          if (typeof err === 'object' && err !== null && 'message' in err) {
            const e = err as Error;
            this.logger.error(`[FFmpeg VOD Error][${streamKey}] ${e.message}`, e.stack);
          } else {
            this.logger.error(`[FFmpeg VOD Error][${streamKey}] ${String(err)}`);
          }
        });

        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            this.logger.error(`[FFmpeg VOD Error][${streamKey}] Process exited with code ${code}`);
          } else {
            this.logger.log(`[FFmpeg VOD][${streamKey}] Recording completed`);
          }
          this.metricService.resetMetrics(streamKey);
        });
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
          const e = error as Error;
          this.logger.error(`[FFmpeg VOD Error][${streamKey}] ${e.message}`, e.stack);
        } else {
          this.logger.error(`[FFmpeg VOD Error][${streamKey}] ${String(error)}`);
        }
      }

      // === Live Metrics ===
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
          if (typeof err === 'object' && err !== null && 'message' in err) {
            const e = err as Error;
            this.logger.error(`[FFmpeg Metrics Error][${streamKey}] ${e.message}`, e.stack);
          } else {
            this.logger.error(`[FFmpeg Metrics Error][${streamKey}] ${String(err)}`);
          }
        });

        metricsFfmpeg.stdout.on('data', (data: Buffer) => {
          const lines = data.toString().split('\n');
          let totalSize = lastTotalSize;

          for (const line of lines) {
            const [key, valueRaw] = line.trim().split('=');
            if (key === 'total_size') {
              totalSize = parseInt(valueRaw || '0', 10);
            }
          }

          const now = Date.now();
          const deltaBytes = totalSize - lastTotalSize;
          const durationSec = (now - lastTimestamp) / 1000;

          if (durationSec <= 0) {
            lastTimestamp = now;
            return;
          }

          const bitrate = (deltaBytes * 8) / 1024 / durationSec;
          lastTotalSize = totalSize;
          lastTimestamp = now;

          const latency = now - lastTime;
          lastTime = now;

          const bandwidth = bitrate * 1.2;

          dataChunksProcessed++;
          if (dataChunksProcessed < 3) return;

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
            this.logger.error(`[FFmpeg Metrics Error][${streamKey}] Process exited with code ${code}`);
          } else {
            this.logger.log(`[FFmpeg Metrics][${streamKey}] Process exited cleanly`);
          }
        });
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
          const e = error as Error;
          this.logger.error(`[FFmpeg Metrics Error][${streamKey}] ${e.message}`, e.stack);
        } else {
          this.logger.error(`[FFmpeg Metrics Error][${streamKey}] ${String(error)}`);
        }
      }
    });

    this.nms.on('donePublish', (id, streamPath) => {
      const streamKey = streamPath.split('/').pop() || 'defaultStreamKey';
      this.logger.log(`[NodeEvent][${streamKey}] Stream ended`);
    });

    this.nms.on('error', (err) => {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        const e = err as Error;
        this.logger.error(`[NodeMediaServer Global Error] ${e.message}`, e.stack);
      } else {
        this.logger.error(`[NodeMediaServer Global Error] ${String(err)}`);
      }
    });

    this.nms.run();
  }
}
