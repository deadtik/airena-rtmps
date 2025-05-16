import {
  Controller,
  Get,
  Post,
  Delete,
  Req,
  Body,
  Param,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { StreamService } from './stream.service';
import { MetricService } from '../metrics/metric.service';
import { ClerkAuthGuard } from '../auth/jwt-auth.guard';

// Extend Request type to include authenticated Clerk user
interface ClerkRequest extends Request {
  user?: {
    userId: string;
  };
}

@UseGuards(ClerkAuthGuard)
@Controller('stream')
export class StreamController {
  constructor(
    private readonly streamService: StreamService,
    private readonly metricService: MetricService,
  ) {}

  @Get('key')
  async getStreamKey(@Req() req: ClerkRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    const { streamKey } = await this.streamService.getOrCreateStreamKey(userId);

    return {
      streamKey,
      streamUrl: `rtmps://yourdomain.com/live/${streamKey}`,
      hlsUrl: `https://yourdomain.com/live/${streamKey}/index.m3u8`,
    };
  }

  @Post('start/:streamKey')
  async startStream(@Req() req: ClerkRequest, @Param('streamKey') streamKey: string) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.streamService.startStream(userId, streamKey);
  }

  @Post('stop/:streamKey')
  async stopStream(@Req() req: ClerkRequest, @Param('streamKey') streamKey: string) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.streamService.stopStream(userId, streamKey);
  }

  @Get('list')
  async listStreams(@Req() req: ClerkRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.streamService.listUserStreams(userId);
  }

  @Get(':streamKey')
  async getStreamDetails(@Req() req: ClerkRequest, @Param('streamKey') streamKey: string) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    return this.streamService.getStreamDetails(userId, streamKey);
  }

  @Get('status/:streamKey')
  async getStreamStatus(@Param('streamKey') streamKey: string) {
    const metrics = await this.metricService.getMetrics(streamKey);
    return {
      isLive: (metrics?.bitrate ?? 0) > 0,
      bitrate: metrics?.bitrate ?? 0,
      latency: metrics?.latency ?? 0,
      bandwidth: metrics?.bandwidth ?? 0,
    };
  }

  @Get('metrics/:streamKey')
  async getStreamMetrics(@Param('streamKey') streamKey: string) {
    const metrics = await this.metricService.getMetrics(streamKey);
    return {
      bitrate: metrics?.bitrate ?? 0,
      latency: metrics?.latency ?? 0,
      bandwidth: metrics?.bandwidth ?? 0,
    };
  }

  @Post('settings/:streamKey')
  async updateStreamSettings(
    @Req() req: ClerkRequest,
    @Param('streamKey') streamKey: string,
    @Body() settings: {
      quality?: string;
      maxBitrate?: number;
      resolution?: string;
    },
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.streamService.updateStreamSettings(userId, streamKey, settings);
  }

  @Delete('key/:streamKey')
  async deleteStreamKey(
    @Req() req: ClerkRequest,
    @Param('streamKey') streamKey: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.streamService.deleteStreamKey(userId, streamKey);
  }
}
