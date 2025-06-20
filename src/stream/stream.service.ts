import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MetricService } from '../metrics/metric.service';

@Injectable()
export class StreamService {
  private readonly rtmpServerUrl: string;
  private readonly hlsServerUrl: string;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
    private readonly metricService: MetricService,
  ) {
    this.rtmpServerUrl = this.configService.get<string>('RTMP_BASE_URL', 'rtmp://localhost:1935');
    this.hlsServerUrl = this.configService.get<string>('HLS_BASE_URL', 'http://localhost:8000');
  }

  private generateStreamKey(): string {
    return randomBytes(16).toString('hex');
  }

  private generateStreamUrl(streamKey: string): string {
    return `${this.rtmpServerUrl}/live/${streamKey}`;
  }

  private generateHlsUrl(streamKey: string): string {
    // NMS serves HLS under /<app_name>/<stream_key>/index.m3u8
    // In nms.service.ts, trans.tasks.app is 'live'.
    return `${this.hlsServerUrl}/live/${streamKey}/index.m3u8`;
  }

  async getOrCreateStreamKey(firebaseId: string): Promise<{
    streamKey: string;
    streamUrl: string;
    hlsUrl: string;
  }> {
    let user = await this.userRepo.findOne({ where: { firebaseId } });

    if (!user) {
      const streamKey = this.generateStreamKey();
      const streamUrl = this.generateStreamUrl(streamKey);
      const hlsUrl = this.generateHlsUrl(streamKey);

      user = this.userRepo.create({
        firebaseId,
        streamKey,
        streamUrl,
        isStreaming: false,
        streamSettings: {
          quality: 'high',
          maxBitrate: 6000,
          resolution: '1920x1080',
        },
      });

      await this.userRepo.save(user);

      return { streamKey, streamUrl, hlsUrl };
    }

    return {
      streamKey: user.streamKey,
      streamUrl: user.streamUrl,
      hlsUrl: this.generateHlsUrl(user.streamKey),
    };
  }

  async startStream(firebaseId: string, streamKey: string) {
    const user = await this.userRepo.findOne({
      where: { firebaseId, streamKey },
    });

    if (!user) throw new NotFoundException('Stream not found');

    user.isStreaming = true;
    await this.userRepo.save(user);

    return {
      success: true,
      message: 'Stream started successfully',
      streamUrl: user.streamUrl,
      hlsUrl: this.generateHlsUrl(streamKey),
    };
  }

  async stopStream(firebaseId: string, streamKey: string) {
    const user = await this.userRepo.findOne({
      where: { firebaseId, streamKey },
    });

    if (!user) throw new NotFoundException('Stream not found');

    user.isStreaming = false;
    await this.userRepo.save(user);

    return {
      success: true,
      message: 'Stream stopped successfully',
    };
  }

  async listUserStreams(firebaseId: string) {
    const user = await this.userRepo.findOne({
      where: { firebaseId },
    });

    if (!user) throw new NotFoundException('User not found');

    const metrics = await this.metricService.getMetrics(user.streamKey);

    return {
      streams: [{
        streamKey: user.streamKey,
        streamUrl: user.streamUrl,
        hlsUrl: this.generateHlsUrl(user.streamKey),
        isLive: user.isStreaming,
        metrics: {
          bitrate: metrics?.bitrate ?? 0,
          latency: metrics?.latency ?? 0,
          bandwidth: metrics?.bandwidth ?? 0,
        },
        settings: user.streamSettings,
      }],
    };
  }

  async getStreamDetails(firebaseId: string, streamKey: string) {
    const user = await this.userRepo.findOne({
      where: { firebaseId, streamKey },
    });

    if (!user) throw new NotFoundException('Stream not found');

    const metrics = await this.metricService.getMetrics(streamKey);

    return {
      streamKey: user.streamKey,
      streamUrl: user.streamUrl,
      hlsUrl: this.generateHlsUrl(streamKey),
      isLive: user.isStreaming,
      metrics: {
        bitrate: metrics?.bitrate ?? 0,
        latency: metrics?.latency ?? 0,
        bandwidth: metrics?.bandwidth ?? 0,
      },
      settings: user.streamSettings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserByStreamKey(streamKey: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { streamKey } });
  }

  async getStreamStatus(streamKey: string) {
    const user = await this.getUserByStreamKey(streamKey);
    if (!user) throw new NotFoundException('Stream not found');

    const metrics = await this.metricService.getMetrics(streamKey);

    return {
      isLive: (metrics?.bitrate ?? 0) > 0,
      bitrate: metrics?.bitrate ?? 0,
      latency: metrics?.latency ?? 0,
      bandwidth: metrics?.bandwidth ?? 0,
    };
  }

  async getStreamStats(streamKey: string) {
    const user = await this.getUserByStreamKey(streamKey);
    if (!user) throw new NotFoundException('Stream not found');

    const metrics = await this.metricService.getMetrics(streamKey);

    return {
      bitrate: metrics?.bitrate ?? 0,
      fps: 0, // Placeholder
      resolution: user.streamSettings?.resolution || '0x0',
      totalViewers: 0,
      peakViewers: 0,
    };
  }

  async updateStreamSettings(
    firebaseId: string,
    streamKey: string,
    settings: {
      quality?: string;
      maxBitrate?: number;
      resolution?: string;
    },
  ) {
    const user = await this.userRepo.findOne({
      where: {
        firebaseId,
        streamKey,
      },
    });

    if (!user) throw new NotFoundException('Stream not found');

    user.streamSettings = {
      ...user.streamSettings,
      ...settings,
    };

    await this.userRepo.save(user);

    return {
      success: true,
      message: 'Stream settings updated successfully',
      settings: user.streamSettings,
    };
  }

  async deleteStreamKey(firebaseId: string, streamKey: string) {
    // This method effectively "regenerates" the stream key by replacing the old one
    // with a new one. The user's stream settings are preserved.
    const user = await this.userRepo.findOne({
      where: {
        firebaseId,
        streamKey,
      },
    });

    if (!user) throw new NotFoundException('Stream key not found');

    const newStreamKey = this.generateStreamKey();
    const newStreamUrl = this.generateStreamUrl(newStreamKey);

    user.streamKey = newStreamKey;
    user.streamUrl = newStreamUrl;
    user.isStreaming = false;

    await this.userRepo.save(user);

    return {
      success: true,
      message: 'Stream key regenerated successfully',
      newStreamKey,
      newStreamUrl,
      hlsUrl: this.generateHlsUrl(newStreamKey),
    };
  }
}
