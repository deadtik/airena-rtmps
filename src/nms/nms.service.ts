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
      this.logger.log(`[NodeEvent] Stream started for ${streamKey}`);

      // === VOD (Video On Demand) Output ===
      // Spawn an FFmpeg process to record the incoming stream to an MP4 file.
      const vodOutputPath = this.vodService.generateVodPath(streamKey);
      try {
        const ffmpeg = spawn(ffmpegPath, [
          '-i', `rtmp://127.0.0.1/live/${streamKey}`,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-y', // overwrite if exists
          vodOutputPath,
        ]);

        ffmpeg.stderr.on('data', (data: Buffer) => {
          // VOD FFmpeg typically outputs progress to stderr
          this.logger.verbose(`[FFmpeg VOD Stderr][${streamKey}] ${data.toString().trim()}`);
        });

        ffmpeg.on('error', (err) => {
          this.logger.error(`[FFmpeg VOD Error][${streamKey}] Failed to start or error during process: ${err.message}`, err.stack);
        });

        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            this.logger.error(`[FFmpeg VOD Error][${streamKey}] Recording process exited with code: ${code}`);
          } else {
            this.logger.log(`[FFmpeg VOD][${streamKey}] Recording ended successfully. Exit code: ${code}`);
          }
          this.metricService.resetMetrics(streamKey);
        });
      } catch (error: unknown) {
        const message = `[FFmpeg VOD Error][${streamKey}] Failed to spawn FFmpeg process for VOD`;
        if (error instanceof Error) {
          this.logger.error(message + `: ${error.message}`, error.stack);
        } else {
          this.logger.error(message + `: ${String(error)}`);
        }
      }

      // === Live Metrics Calculation ===
      // Spawn a separate FFmpeg process that consumes the stream but outputs no file (-f null).
      // Its stderr (when -stats is used) or stdout (when -progress pipe:1 is used) provides raw data
      // which can be parsed to calculate live metrics like bitrate.
      let lastTotalSize = 0;
      let lastTimestamp = Date.now();
      let lastTime = Date.now(); // For latency calculation
      let dataChunksProcessed = 0; // Counter for initial data points

      try {
        const metricsFfmpeg = spawn(ffmpegPath, [
          '-i', `rtmp://127.0.0.1/live/${streamKey}`,
          '-f', 'null',
          '-',
          '-stats',
          '-progress', 'pipe:1', // Ensure progress is written to stdout
        ]);

        metricsFfmpeg.on('error', (err) => {
          this.logger.error(`[FFmpeg Metrics Error][${streamKey}] Failed to start or error during process: ${err.message}`, err.stack);
        });

        metricsFfmpeg.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        let totalSize = lastTotalSize;

        for (const line of lines) {
          const [key, valueRaw] = line.trim().split('=');
          const value = valueRaw ?? '0';

          // FFmpeg -progress pipe:1 output includes lines like 'total_size=N'
          if (key === 'total_size') {
            totalSize = parseInt(value, 10); // Total bytes processed so far
          }
        }

        const now = Date.now();
        const deltaBytes = totalSize - lastTotalSize; // Bytes processed in this interval
        const durationSec = (now - lastTimestamp) / 1000; // Duration of this interval in seconds

        dataChunksProcessed++;

        // Avoid division by zero or extremely small intervals which can lead to skewed bitrate.
        if (durationSec <= 0) {
          this.logger.verbose(`[FFmpeg Metrics][${streamKey}] Duration too short (${durationSec}s), skipping bitrate calculation for this interval.`);
          lastTimestamp = now; // Update timestamp to prevent stale calculations in the next interval.
          // We don't update lastTotalSize here, so deltaBytes in the next interval will account for bytes from this ignored period.
          return;
        }

        // Calculate bitrate: (bytes * 8 bits/byte) / (1024 bits/Kb) / seconds = Kbps
        const bitrate = (deltaBytes * 8) / 1024 / durationSec;

        lastTotalSize = totalSize;
        lastTimestamp = now;

        // This latency measures the time taken by the FFmpeg stats process itself to output data.
        // It's an indicator of the FFmpeg process's health on the server, not end-to-end stream latency.
        const latency = now - lastTime;
        lastTime = now;

        // Estimate required bandwidth, e.g., 20% overhead on current bitrate.
        const bandwidth = bitrate * 1.2;

        // Skip sending metrics for the first few data chunks to allow values to stabilize.
        // FFmpeg often reports very high initial bitrates as it starts processing.
        if (dataChunksProcessed < 3) {
          this.logger.verbose(`[FFmpeg Metrics][${streamKey}] Initial data point (${dataChunksProcessed}), waiting for more data before sending update.`);
          // lastTotalSize and lastTimestamp are updated, so the next calculation will use this point as its base.
          return;
        }

        this.metricService.updateMetrics(streamKey, {
          bitrate: Math.round(bitrate),
          latency,
          bandwidth: Number(bandwidth.toFixed(2)),
        });
      });

      metricsFfmpeg.stderr.on('data', (data: Buffer) => {
        this.logger.warn(`[FFmpeg Metrics Stderr][${streamKey}]: ${data.toString().trim()}`);
      });

      metricsFfmpeg.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`[FFmpeg Metrics Error][${streamKey}] Metrics process exited with code: ${code}`);
        } else {
          this.logger.log(`[FFmpeg Metrics][${streamKey}] Metrics process for ${streamKey} exited successfully with code ${code}`);
        }
      });
    } catch (error: unknown) {
      const message = `[FFmpeg Metrics Error][${streamKey}] Failed to spawn FFmpeg process for metrics`;
      if (error instanceof Error) {
        this.logger.error(message + `: ${error.message}`, error.stack);
      } else {
        this.logger.error(message + `: ${String(error)}`);
      }
    }
    });

    // Event listener for when a stream finishes publishing.
    this.nms.on('donePublish', (id, streamPath, args) => {
      const streamKey = streamPath.split('/').pop() || 'defaultStreamKey';
      this.logger.log(`[NodeEvent][${streamKey}] Stream publishing finished.`);
      // The metricService.resetMetrics is called when the VOD FFmpeg process 'close' event fires.
      // This usually aligns with 'donePublish'. If VOD recording is not active or fails much earlier
      // than the stream itself stopping, metrics for that streamKey might persist until the next
      // stream with the same key starts or if manual cleanup is implemented elsewhere.
    });

    // Global error handler for the NodeMediaServer instance itself.
    // This can catch errors not specific to a single stream/event but related to NMS core operations.
    this.nms.on('error', (err: unknown) => {
      const message = `[NodeMediaServer Global Error]`;
      if (err instanceof Error) {
        this.logger.error(message + `: ${err.message}`, err.stack);
      } else {
        this.logger.error(message + `: ${String(err)}`);
      }
      // Depending on the severity and type of error, NMS might become unstable.
      // For production systems, more sophisticated error handling (e.g., attempting to restart NMS,
      // or alerting mechanisms) might be necessary. Such logic would need careful implementation
      // to avoid restart loops or other unintended consequences.
    });

    this.nms.run();
  }
}
