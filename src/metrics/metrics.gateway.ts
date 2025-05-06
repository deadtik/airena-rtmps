// src/metrics/metric.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
  } from '@nestjs/websockets';
  import { Server } from 'socket.io';
  
  @WebSocketGateway({ cors: true })
  export class MetricGateway implements OnGatewayInit {
    @WebSocketServer()
    server!:Server;
  
    afterInit() {
      console.log('[Gateway] WebSocket initialized');
    }
  
    broadcastMetrics(streamKey: string, data: any) {
      this.server.emit('broadcastMetrics', data);
    }
  }
  