import NodeMediaServer from 'node-media-server';
import * as path from 'path';

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*'
  },
  trans: {
    ffmpeg: 'C:/ffmpeg/bin/ffmpeg.exe',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=5:hls_flags=delete_segments]',
        hlsKeep: true,
        hlsPath: path.join(__dirname, '../../public/media'),
        hlsCleanup: true
      }
    ]
  }
};

const nms = new NodeMediaServer(config);

export function startNMS() {
  nms.run();
}