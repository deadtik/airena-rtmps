import { VodService } from './vod.service';
import { Response } from 'express';
export declare class VodController {
    private readonly vodService;
    constructor(vodService: VodService);
    listVodFiles(): string[];
    downloadVod(filename: string, res: Response): void;
}
