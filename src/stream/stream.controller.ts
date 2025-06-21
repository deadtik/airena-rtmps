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

// Extend Request type to include authenticated Firebase user
interface FirebaseRequest extends Request {
  user?: { // This structure depends on what FirebaseAuthMiddleware attaches
    uid: string; // Firebase UID
    email?: string; // Optional: email if attached by middleware
    // Add other properties from the decoded Firebase token if they are attached
  };
}

<<<<<<< HEAD
// @UseGuards(FirebaseAuthGuard) // If you create a specific guard later
=======
@UseGuards(ClerkAuthGuard)
>>>>>>> 96bb04a23eef9507c65e7e6bad3438844a16b6e1
@Controller('stream')
export class StreamController {
  constructor(
    private readonly streamService: StreamService,
    private readonly metricService: MetricService, // Assuming this is still needed for other endpoints
  ) {}

  @Get('credentials') // New endpoint path
  async getStreamCredentials(@Req() req: FirebaseRequest) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated or UID missing.');
    // getOrCreateStreamKey now returns streamKey, streamUrl, hlsUrl, isStreaming, streamSettings
    return this.streamService.getOrCreateStreamKey(firebaseId);
  }

  @Post('regenerate-key') // New endpoint path and method
  async regenerateStreamKey(@Req() req: FirebaseRequest) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated or UID missing.');
    return this.streamService.regenerateStreamKey(firebaseId);
  }

  @Post('start/:streamKey')
  async startStream(@Req() req: FirebaseRequest, @Param('streamKey') streamKey: string) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated or UID missing.');
    return this.streamService.startStream(firebaseId, streamKey);
  }

  @Post('stop/:streamKey')
  async stopStream(@Req() req: FirebaseRequest, @Param('streamKey') streamKey: string) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated or UID missing.');
    return this.streamService.stopStream(firebaseId, streamKey);
  }

  @Get('list')
  async listStreams(@Req() req: FirebaseRequest) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated or UID missing.');
    return this.streamService.listUserStreams(firebaseId);
  }

  @Get(':streamKey')
  async getStreamDetails(@Req() req: FirebaseRequest, @Param('streamKey') streamKey: string) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated or UID missing.');
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
    @Body() settings: {
      quality?: string;
      maxBitrate?: number;
      resolution?: string;
    },
  ) {
    const firebaseId = req.user?.uid;
    if (!firebaseId) throw new UnauthorizedException('User not authenticated or UID missing.');

    return this.streamService.updateStreamSettings(firebaseId, streamKey, settings);
  }

  // The regenerate-key endpoint effectively replaces the old deleteStreamKey functionality
  // So, the @Delete('key/:streamKey') endpoint is removed.
}
