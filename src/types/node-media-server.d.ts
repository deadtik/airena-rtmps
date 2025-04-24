declare module 'node-media-server' {
    interface RtmpConfig {
      port: number;
      chunk_size: number;
      gop_cache: boolean;
      ping: number;
      ping_timeout: number;
    }
  
    interface HttpConfig {
      port: number;
      mediaroot: string;
      allow_origin: string;
    }
  
    interface TransConfig {
      ffmpeg: string;
      tasks: Array<{
        app: string;
        hls: boolean;
        hlsFlags: string;
        dash: boolean;
        vc?: string;
        ac?: string;
      }>;
    }
  
    interface Config {
      rtmp: RtmpConfig;
      http: HttpConfig;
      trans?: TransConfig;
    }
  
    class NodeMediaServer {
      constructor(config: Config);
      run(): void;
      on(event: string, callback: (...args: any[]) => void): void;
    }
  
    export = NodeMediaServer;
  }