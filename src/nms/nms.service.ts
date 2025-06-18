import { Injectable, OnModuleInit } from '@nestjs/common';
import NodeMediaServer from 'node-media-server';
import { MetricService } from '../metrics/metric.service';
import { VodService } from '../vod/vod.service';
import { spawn } from 'child_process';

@Injectable()
export class NmsService implements OnModuleInit {
  private nms!: NodeMediaServer;

  constructor(
    private readonly metricService: MetricService,
    private readonly vodService: VodService,
  ) {}

  onModuleInit() {
    const config = {
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        mediaroot: './media',
        port: 8000,
        allow_origin: '*',
      },
      trans: {
        ffmpeg: 'C:/ffmpeg/bin/ffmpeg.exe', // adjust path if needed
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
      console.log(`[NodeEvent] Stream started for ${streamKey}`);

      // === VOD Output ===
      const vodOutputPath = this.vodService.generateVodPath(streamKey);
      const ffmpeg = spawn('ffmpeg', [
        '-i', `rtmp://127.0.0.1/live/${streamKey}`,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-y', // overwrite if exists
        vodOutputPath,
      ]);

      let lastTotalSize = 0;
      let lastTimestamp = Date.now();
      let lastTime = Date.now();

      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        // Optional: parse metrics from stderr logs (if needed)
        console.log(`[FFmpeg][${streamKey}]`, output);
      });

      ffmpeg.on('error', (err) => {
        console.error(`[FFmpeg][${streamKey}] Error:`, err.message);
      });

      ffmpeg.on('close', (code) => {
        console.log(`[FFmpeg][${streamKey}] Recording ended. Exit code: ${code}`);
        this.metricService.resetMetrics(streamKey);
      });

      // Optional: Run separate stats process
      const metricsFfmpeg = spawn('ffmpeg', [
        '-i', `rtmp://127.0.0.1/live/${streamKey}`,
        '-f', 'null',
        '-',
        '-stats',
        '-progress', 'pipe:1',
      ]);

      metricsFfmpeg.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        let totalSize = lastTotalSize;

        for (const line of lines) {
          const [key, valueRaw] = line.trim().split('=');
          const value = valueRaw ?? '0';

          if (key === 'total_size') {
            totalSize = parseInt(value, 10);
          }
        }

        const now = Date.now();
        const deltaBytes = totalSize - lastTotalSize;
        const durationSec = (now - lastTimestamp) / 1000;
        const bitrate = (deltaBytes * 8) / 1024 / durationSec;

        lastTotalSize = totalSize;
        lastTimestamp = now;

        const latency = now - lastTime;
        lastTime = now;

        const bandwidth = bitrate * 1.2;

        this.metricService.updateMetrics(streamKey, {
          bitrate: Math.round(bitrate),
          latency,
          bandwidth: Number(bandwidth.toFixed(2)),
        });
      });

      metricsFfmpeg.stderr.on('data', (data: Buffer) => {
        console.error(`FFmpeg metrics stderr [${streamKey}]:`, data.toString());
      });

      metricsFfmpeg.on('close', (code) => {
        console.log(`FFmpeg metrics process for ${streamKey} exited with code ${code}`);
      });
    });

    this.nms.run();
  }
}
