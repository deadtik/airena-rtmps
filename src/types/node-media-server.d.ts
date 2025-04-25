declare module 'node-media-server';
declare module 'node-media-server' {
  import { EventEmitter } from 'events';

  export interface MediaServerOptions {
    rtmp: {
      port: number;
      chunk_size: number;
      gop_cache: boolean;
      ping: number;
      ping_timeout: number;
    };
    http: {
      port: number;
      allow_origin: string;
    };
    https?: {
      port: number;
      allow_origin: string;
      key: string;
      cert: string;
    };
  }

  export class NodeMediaServer extends EventEmitter {
    constructor(options: MediaServerOptions);
    run(): void;
    stop(): void;
  }
}