import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stream } from './stream.entity';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User } from './user.entity';

@Injectable()
export class StreamService {
  private readonly rtmpServerUrl: string;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {
    this.rtmpServerUrl = this.configService.get<string>('RTMP_SERVER_URL') || 'rtmps://yourdomain.com';
  }

  private generateStreamKey(): string {
    return randomBytes(16).toString('hex');
  }

  private generateStreamUrl(streamKey: string): string {
    return `${this.rtmpServerUrl}/live/${streamKey}`;
  }

  async getOrCreateStreamKey(clerkId: string): Promise<{ streamKey: string; streamUrl: string }> {
    let user = await this.userRepo.findOne({ where: { clerkId } });

    if (!user) {
      const streamKey = this.generateStreamKey();
      const streamUrl = this.generateStreamUrl(streamKey);

      user = this.userRepo.create({
        clerkId,
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
    }

    return {
      streamKey: user.streamKey,
      streamUrl: user.streamUrl,
    };
  }

  async getUserByStreamKey(streamKey: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { streamKey } });
  }

  async getStreamStatus(streamKey: string) {
    const user = await this.getUserByStreamKey(streamKey);
    if (!user) {
      throw new NotFoundException('Stream not found');
    }

    return {
      isLive: user.isStreaming,
      viewers: 0,
      startTime: null,
      duration: 0,
    };
  }

  async getStreamStats(streamKey: string) {
    const user = await this.getUserByStreamKey(streamKey);
    if (!user) {
      throw new NotFoundException('Stream not found');
    }

    return {
      bitrate: 0, // placeholder, to be filled by RTMP metric service
      fps: 0,
      resolution: user.streamSettings?.resolution || '0x0',
      totalViewers: 0,
      peakViewers: 0,
    };
  }

  async updateStreamSettings(
    clerkId: string,
    streamKey: string,
    settings: {
      quality?: string;
      maxBitrate?: number;
      resolution?: string;
    },
  ) {
    const user = await this.userRepo.findOne({
      where: {
        clerkId,
        streamKey,
      },
    });

    if (!user) {
      throw new NotFoundException('Stream not found');
    }

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

  async deleteStreamKey(clerkId: string, streamKey: string) {
    const user = await this.userRepo.findOne({
      where: {
        clerkId,
        streamKey,
      },
    });

    if (!user) {
      throw new NotFoundException('Stream key not found');
    }

    const newStreamKey = this.generateStreamKey();
    const newStreamUrl = this.generateStreamUrl(newStreamKey);

    user.streamKey = newStreamKey;
    user.streamUrl = newStreamUrl;
    user.isStreaming = false;

    await this.userRepo.save(user);

    return {
      success: true,
      message: 'Stream key regenerated successfully',
      newStreamKey: user.streamKey,
      newStreamUrl: user.streamUrl,
    };
  }
}
