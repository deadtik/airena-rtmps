import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { StreamService } from './stream.service';
import { MetricService } from '../metrics/metric.service';

// Extend Request to include Firebase UID
interface FirebaseRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

@Controller('stream')
export class StreamController {
  constructor(
    private readonly streamService: StreamService,
    private readonly metricService: MetricService,
  ) {}

  @Get('credentials')
  async getStreamCredentials(@Req() req: FirebaseRequest) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.getOrCreateStreamKey(firebaseId);
  }

  @Post('regenerate-key')
  async regenerateStreamKey(@Req() req: FirebaseRequest) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.regenerateStreamKey(firebaseId);
  }

  @Post('start/:streamKey')
  async startStream(@Req() req: FirebaseRequest, @Param('streamKey') streamKey: string) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.startStream(firebaseId, streamKey);
  }

  @Post('stop/:streamKey')
  async stopStream(@Req() req: FirebaseRequest, @Param('streamKey') streamKey: string) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.stopStream(firebaseId, streamKey);
  }

  @Get('list')
  async listUserStreams(@Req() req: FirebaseRequest) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.listUserStreams(firebaseId);
  }

  @Get(':streamKey')
  async getStreamDetails(@Req() req: FirebaseRequest, @Param('streamKey') streamKey: string) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.getStreamDetails(firebaseId, streamKey);
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
    @Req() req: FirebaseRequest,
    @Param('streamKey') streamKey: string,
    @Body()
    settings: {
      quality?: string;
      maxBitrate?: number;
      resolution?: string;
    },
  ) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated.');
    return this.streamService.updateStreamSettings(firebaseId, streamKey, settings);
  }
}
