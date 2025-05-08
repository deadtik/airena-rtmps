import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { Request } from 'express';
import { User } from 'src/stream/user.entity';

interface CustomRequest extends Request {
  user?: { id: string; email: string }; // Adjust the user properties as needed
}

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('vast-tag')
  getVastTag(@Req() req: CustomRequest): { vastTag: string } {
    const user = req.user; // JWT should populate this
    const vastTag = this.adsService.generateVastTag({ preferences: {} });
    return { vastTag };
  }
}