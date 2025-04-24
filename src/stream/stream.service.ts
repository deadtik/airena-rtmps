import { Injectable } from '@nestjs/common';

@Injectable()
export class StreamService {
  getStatus() {
    return { live: true, viewers: 0 };
  }
}