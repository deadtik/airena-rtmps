import { Injectable } from '@nestjs/common';

@Injectable()
export class AdsService {
  generateVastTag(user: { preferences: any }): string {
    const { interest = 'gaming', age = 25 } = user.preferences || {};

    const encodedDescriptionUrl = encodeURIComponent('airena.app');

    const vastTag = `https://pubads.g.doubleclick.net/gampad/ads?iu=/1234567/stream_pre_roll&description_url=${encodedDescriptionUrl}&cust_params=interest=${interest}&age=${age}&env=vp&output=vast`;

    return vastTag;
  }
}