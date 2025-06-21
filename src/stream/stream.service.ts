import { Injectable, NotFoundException } from '@nestjs/common';
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
    return `${this.hlsServerUrl}/live/${streamKey}/index.m3u8`;
  }

  async getOrCreateStreamKey(firebaseId: string) {
    let user = await this.userRepo.findOne({ where: { firebaseId } });

    if (!user) {
      const streamKey = this.generateStreamKey();
      const streamUrl = this.generateStreamUrl(streamKey);

      user = this.userRepo.create({
        firebaseId,
        streamKey,
        streamUrl,
        isStreaming: false,
        streamSettings: JSON.stringify({
          quality: 'high',
          maxBitrate: 6000,
          resolution: '1920x1080',
        }),
      });

      await this.userRepo.save(user);
    }

    return {
      streamKey: user.streamKey!,
      streamUrl: user.streamUrl!,
      hlsUrl: this.generateHlsUrl(user.streamKey!),
      isStreaming: user.isStreaming,
      streamSettings: typeof user.streamSettings === 'string'
        ? JSON.parse(user.streamSettings)
        : user.streamSettings,
    };
  }

  async regenerateStreamKey(firebaseId: string) {
    const user = await this.userRepo.findOne({ where: { firebaseId } });
    if (!user) throw new NotFoundException(`User with Firebase ID ${firebaseId} not found.`);

    const newStreamKey = this.generateStreamKey();
    const newStreamUrl = this.generateStreamUrl(newStreamKey);

    user.streamKey = newStreamKey;
    user.streamUrl = newStreamUrl;
    user.isStreaming = false;

    await this.userRepo.save(user);

    return {
      message: 'Stream key regenerated successfully.',
      streamKey: newStreamKey,
      streamUrl: newStreamUrl,
      hlsUrl: this.generateHlsUrl(newStreamKey),
    };
  }

  async startStream(firebaseId: string, streamKey: string) {
    const user = await this.userRepo.findOne({ where: { firebaseId, streamKey } });
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
    const user = await this.userRepo.findOne({ where: { firebaseId, streamKey } });
    if (!user) throw new NotFoundException('Stream not found');

    user.isStreaming = false;
    await this.userRepo.save(user);

    return { success: true, message: 'Stream stopped successfully' };
  }

  async listUserStreams(firebaseId: string) {
    const user = await this.userRepo.findOne({ where: { firebaseId } });
    if (!user) throw new NotFoundException('User not found');

    const metrics = await this.metricService.getMetrics(user.streamKey ?? '');

    return {
      streams: [{
        streamKey: user.streamKey,
        streamUrl: user.streamUrl,
        hlsUrl: this.generateHlsUrl(user.streamKey ?? ''),
        isLive: user.isStreaming,
        metrics: {
          bitrate: metrics?.bitrate ?? 0,
          latency: metrics?.latency ?? 0,
          bandwidth: metrics?.bandwidth ?? 0,
        },
        settings: typeof user.streamSettings === 'string'
          ? JSON.parse(user.streamSettings)
          : user.streamSettings,
      }],
    };
  }

  async getStreamDetails(firebaseId: string, streamKey: string) {
    const user = await this.userRepo.findOne({ where: { firebaseId, streamKey } });
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
      settings: typeof user.streamSettings === 'string'
        ? JSON.parse(user.streamSettings)
        : user.streamSettings,
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
    const parsedSettings = typeof user.streamSettings === 'string'
      ? JSON.parse(user.streamSettings)
      : user.streamSettings;

    return {
      bitrate: metrics?.bitrate ?? 0,
      fps: 0,
      resolution: parsedSettings?.resolution || '0x0',
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
    const user = await this.userRepo.findOne({ where: { firebaseId, streamKey } });
    if (!user) throw new NotFoundException('Stream not found');

    const currentSettings = typeof user.streamSettings === 'string'
      ? JSON.parse(user.streamSettings)
      : user.streamSettings || {};

    user.streamSettings = {
      ...currentSettings,
      ...settings,
    };

    await this.userRepo.save(user);

    return {
      success: true,
      message: 'Stream settings updated successfully',
      settings: user.streamSettings,
    };
  }
}
