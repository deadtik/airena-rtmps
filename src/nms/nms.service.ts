import { Injectable, OnModuleInit } from '@nestjs/common';
import NodeMediaServer from 'node-media-server';

@Injectable()
export class NmsService implements OnModuleInit {
  private nms: any;

  onModuleInit() {
    // Configure NodeMediaServer
    const config = {
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_interval: 60,
      },
      http: {
        port: 8000,
        mediaroot: './public/media',
        webroot: './public',
        allow_origin: '*',
      },
      trans: {
        ffmpeg: 'C:/ffmpeg/bin/ffmpeg.exe', // Update this path according to your system's FFmpeg location
        tasks: [
          {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=10:hls_list_size=6:hls_allow_cache=1]',
          },
        ],
      },
    };

    this.nms = new NodeMediaServer(config);
    this.nms.run();

    console.log('NodeMediaServer is running');
  }
}
