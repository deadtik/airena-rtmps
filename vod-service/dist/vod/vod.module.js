"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VodModule = void 0;
const common_1 = require("@nestjs/common");
const vod_service_1 = require("./vod.service");
const vod_controller_1 = require("./vod.controller");
const typeorm_1 = require("@nestjs/typeorm");
const vod_entity_1 = require("./vod.entity");
let VodModule = class VodModule {
};
exports.VodModule = VodModule;
exports.VodModule = VodModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([vod_entity_1.Vod])],
        providers: [vod_service_1.VodService],
        controllers: [vod_controller_1.VodController],
        exports: [vod_service_1.VodService],
    })
], VodModule);
//# sourceMappingURL=vod.module.js.map