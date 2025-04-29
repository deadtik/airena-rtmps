import { Injectable } from '@nestjs/common';
import { Stream } from './stream.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StreamService {
  constructor(
    @InjectRepository(Stream)
    private streamRepository: Repository<Stream>,
  ) {}

  // Generate a unique stream key
  generateStreamKey(): string {
    return uuidv4();
  }

  // Generate a stream URL based on the stream key
  getStreamUrl(key: string): string {
    return `rtmps://your-server-address/live/${key}`;
  }

  // Create and store a new stream record
  async createStream(userId: number): Promise<Stream> {
    const streamKey = this.generateStreamKey();
    const streamUrl = this.getStreamUrl(streamKey);

    const newStream = this.streamRepository.create({
      streamKey,
      streamUrl,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.streamRepository.save(newStream);
  }

  // Fetch stream by its key
  async getStreamByKey(key: string): Promise<Stream> {
    const stream = await this.streamRepository.findOne({ where: { streamKey: key } });
    if (!stream) {
      throw new Error(`Stream with key ${key} not found`);
    }
    return stream;
  }
}
