import { Injectable, OnModuleInit } from '@nestjs/common';
import NodeMediaServer from 'node-media-server';
import { MetricService } from '../metrics/metric.service';
import { spawn } from 'child_process';

@Injectable()
export class NmsService implements OnModuleInit {
  private nms!: NodeMediaServer;

  constructor(private readonly metricService: MetricService) {}

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
        ffmpeg: 'ffmpeg', //  Use globally installed ffmpeg
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

      const ffmpeg = spawn('ffmpeg', [
        '-i', `rtmp://127.0.0.1/live/${streamKey}`,
        '-f', 'null',
        '-',
        '-stats',
        '-progress', 'pipe:1',
      ]);

      let lastTotalSize = 0;
      let lastTimestamp = Date.now();
      let lastTime = Date.now();

      ffmpeg.stdout.on('data', (data: Buffer) => {
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
        const bitrate = (deltaBytes * 8) / 1024 / durationSec; // kbps

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

      ffmpeg.stderr.on('data', (data: Buffer) => {
        console.error(`FFmpeg stderr [${streamKey}]:`, data.toString());
      });

      ffmpeg.on('error', (err) => {
        console.error(`FFmpeg error for ${streamKey}:`, err.message);
      });

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process for ${streamKey} exited with code ${code}`);
        this.metricService.resetMetrics(streamKey);
      });
    });

    this.nms.run();
  }
}
