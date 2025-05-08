// src/ads/ads.module.ts
import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({
  controllers: [AdsController],
  providers: [AdsService],
})
export class AdsModule {}
