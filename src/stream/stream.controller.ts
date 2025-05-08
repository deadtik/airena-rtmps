import { Controller, Get, Post, Delete, Req, Body, Param, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { StreamService } from './stream.service';
import { MetricService } from '../metrics/metric.service';

interface CustomRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
}

@Controller('stream')
export class StreamController {
  constructor(
    private readonly streamService: StreamService,
    private readonly metricService: MetricService
  ) {}

  @Get('key')
  async getKey(@Req() req: CustomRequest) {
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const { streamKey, streamUrl } = await this.streamService.getOrCreateStreamKey(clerkId);

    return {
      streamKey,
      streamUrl: `rtmp://localhost:1935/live/${streamKey}`,
      hlsUrl: `http://localhost:8000/live/${streamKey}/index.m3u8`
    };
  }

  @Get('status/:streamKey')
  async getStreamStatus(@Param('streamKey') streamKey: string) {
    const metrics = await this.metricService.getMetrics(streamKey) || {
      bitrate: 0,
      latency: 0,
      bandwidth: 0
    };
    
    return {
      isLive: metrics.bitrate > 0,
      bitrate: metrics.bitrate,
      latency: metrics.latency,
      bandwidth: metrics.bandwidth
    };
  }

  @Get('metrics/:streamKey')
  async getStreamMetrics(@Param('streamKey') streamKey: string) {
    return this.metricService.getMetrics(streamKey) || {
      bitrate: 0,
      latency: 0,
      bandwidth: 0
    };
  }

  @Post('settings/:streamKey')
  async updateStreamSettings(
    @Req() req: CustomRequest,
    @Param('streamKey') streamKey: string,
    @Body() settings: {
      quality?: string;
      maxBitrate?: number;
      resolution?: string;
    }
  ) {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.streamService.updateStreamSettings(clerkId, streamKey, settings);
  }

  @Delete('key/:streamKey')
  async deleteStreamKey(
    @Req() req: CustomRequest,
    @Param('streamKey') streamKey: string
  ) {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.streamService.deleteStreamKey(clerkId, streamKey);
  }
}
