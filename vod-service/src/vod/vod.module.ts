// src/vod/vod.module.ts
import { Module } from '@nestjs/common';
import { VodService } from './vod.service';
import { VodController } from './vod.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vod } from './vod.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vod])],
  providers: [VodService],
  controllers: [VodController],
  exports: [VodService], // Needed for NmsService
})
export class VodModule {}
