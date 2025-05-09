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

// Extend Express Request to include Clerk-authenticated user
interface ClerkRequest extends Request {
  user?: {
    sub: string; // Clerk user ID typically comes in `sub`
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
  async getKey(@Req() req: ClerkRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const { streamKey } = await this.streamService.getOrCreateStreamKey(userId);

    return {
      streamKey,
      streamUrl: `rtmps://yourdomain.com/live/${streamKey}`,
      hlsUrl: `https://yourdomain.com/live/${streamKey}/index.m3u8`,
    };
  }

  @Get('status/:streamKey')
  async getStreamStatus(@Param('streamKey') streamKey: string) {
    const metrics = await this.metricService.getMetrics(streamKey);
    const fallback = { bitrate: 0, latency: 0, bandwidth: 0 };
    return {
      isLive: (metrics?.bitrate ?? 0) > 0,
      ...(metrics ?? fallback),
    };
  }

  @Get('metrics/:streamKey')
  async getStreamMetrics(@Param('streamKey') streamKey: string) {
    return (
      (await this.metricService.getMetrics(streamKey)) ?? {
        bitrate: 0,
        latency: 0,
        bandwidth: 0,
      }
    );
  }

  @Post('settings/:streamKey')
  async updateStreamSettings(
    @Req() req: ClerkRequest,
    @Param('streamKey') streamKey: string,
    @Body()
    settings: {
      quality?: string;
      maxBitrate?: number;
      resolution?: string;
    },
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.streamService.updateStreamSettings(userId, streamKey, settings);
  }

  @Delete('key/:streamKey')
  async deleteStreamKey(
    @Req() req: ClerkRequest,
    @Param('streamKey') streamKey: string,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.streamService.deleteStreamKey(userId, streamKey);
  }
}
