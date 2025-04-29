import { Controller, Post, Param, Body, Get } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamUrlDto } from './dto/stream-url.dto';
import { Stream } from './stream.entity';

@Controller('streams')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Post('create')
  async createStream(@Body() body: { userId: number }): Promise<Stream> {
    return this.streamService.createStream(body.userId);
  }

  @Get('url/:key')
  async getStreamUrl(@Param('key') key: string): Promise<StreamUrlDto> {
    const stream = await this.streamService.getStreamByKey(key);
    return { streamKey: stream.streamKey, streamUrl: stream.streamUrl };
  }
}
