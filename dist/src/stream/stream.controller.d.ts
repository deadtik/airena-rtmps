import { StreamService } from './stream.service';
export declare class StreamController {
    private readonly streamService;
    constructor(streamService: StreamService);
    getStatus(): {
        live: boolean;
        viewers: number;
    };
}
