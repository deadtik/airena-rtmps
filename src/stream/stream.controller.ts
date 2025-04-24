import { Controller, Get } from '@nestjs/common';
import { StreamService } from './stream.service';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Get('status')
  getStatus() {
    return this.streamService.getStatus();
  }
}