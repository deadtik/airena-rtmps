// src/vod/vod.module.ts
import { Module } from '@nestjs/common';
import { VodService } from './vod.service';
import { VodController } from './vod.controller';

@Module({
  providers: [VodService],
  controllers: [VodController],
  exports: [VodService], // Needed for NmsService
})
export class VodModule {}
