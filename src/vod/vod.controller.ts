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

    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.download(filePath, (err) => {
        if (err) {
          // Log the error, but the response might have already been partially sent.
          // NestJS default error handler might take over if headers not sent.
          // For robust download error handling, more advanced checks are needed,
          // but this covers basic cases.
          console.error('Error downloading file:', err);
          if (!res.headersSent) {
            res.status(500).send('Error during file download.');
          }
        }
      });
    } else if (!filePath) {
      // filePath is null due to security check in service or invalid chars
      res.status(400).send('Invalid filename or potential path traversal attempt.');
    } else {
      // File does not exist at the constructed path, or it's not a file
      res.status(404).send('File not found or is not a regular file.');
    }
  }
}
