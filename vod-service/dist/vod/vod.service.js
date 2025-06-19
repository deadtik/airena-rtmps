"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VodService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
let VodService = class VodService {
    vodRoot = path.resolve('./media/vod');
    constructor() {
        if (!fs.existsSync(this.vodRoot)) {
            fs.mkdirSync(this.vodRoot, { recursive: true });
        }
    }
    generateVodPath(streamKey) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${streamKey}-${timestamp}.mp4`;
        return path.join(this.vodRoot, filename);
    }
    listVodFiles() {
        return fs.readdirSync(this.vodRoot);
    }
    getVodFilePath(filename) {
        return path.join(this.vodRoot, filename);
    }
};
exports.VodService = VodService;
exports.VodService = VodService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], VodService);
//# sourceMappingURL=vod.service.js.map