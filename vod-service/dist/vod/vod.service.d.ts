export declare class VodService {
    private vodRoot;
    constructor();
    generateVodPath(streamKey: string): string;
    listVodFiles(): string[];
    getVodFilePath(filename: string): string;
}
