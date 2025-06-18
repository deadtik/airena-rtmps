// src/vod/vod.controller.ts
import { Controller, Get, Param, Res } from '@nestjs/common';
import { VodService } from './vod.service';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('vod')
export class VodController {
  constructor(private readonly vodService: VodService) {}

  @Get()
  listVodFiles() {
    return this.vodService.listVodFiles();
  }

  @Get(':filename')
  downloadVod(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.vodService.getVodFilePath(filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send('File not found');
    }
  }
}
