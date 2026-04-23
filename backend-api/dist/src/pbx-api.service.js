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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PbxApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PbxApiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let PbxApiService = PbxApiService_1 = class PbxApiService {
    configService;
    logger = new common_1.Logger(PbxApiService_1.name);
    apiUrl;
    domain;
    apiKey;
    constructor(configService) {
        this.configService = configService;
        this.apiUrl = this.configService.get('PBX_API_URL') || '';
        this.domain = this.configService.get('PBX_DOMAIN') || '';
        this.apiKey = this.configService.get('PBX_API_KEY') || '';
    }
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };
    }
    async fetchCdrRecords(dateFrom, dateTo, offset = 0) {
        if (!this.apiUrl) {
            this.logger.warn('PBX_API_URL is not configured. Skipping fetch.');
            return { data: [], total: 0 };
        }
        const fromStr = `${dateFrom} 00:00:00`;
        const toStr = `${dateTo} 23:59:59`;
        try {
            const response = await axios_1.default.get(this.apiUrl, {
                params: {
                    domain: this.domain,
                    from: fromStr,
                    to: toStr,
                    limit: 100,
                    offset: offset,
                },
                headers: this.getHeaders(),
            });
            if (response.status === 200) {
                return response.data;
            }
            else {
                this.logger.error(`❌ [Loicansua] PBX API error: ${response.status} - ${response.statusText}`);
                return { data: [], total: 0 };
            }
        }
        catch (error) {
            this.logger.error(`❌ [Loicansua] Error fetching PBX CDR records: ${error.message}`);
            return { data: [], total: 0 };
        }
    }
    async fetchAllCdrRecords(dateFrom, dateTo) {
        let allRecords = [];
        let offset = 0;
        while (true) {
            const result = await this.fetchCdrRecords(dateFrom, dateTo, offset);
            const records = result.data || [];
            if (records.length === 0)
                break;
            allRecords.push(...records);
            const nextOffset = result.next_offset;
            if (nextOffset === undefined || nextOffset <= offset)
                break;
            offset = nextOffset;
        }
        return allRecords;
    }
};
exports.PbxApiService = PbxApiService;
exports.PbxApiService = PbxApiService = PbxApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PbxApiService);
//# sourceMappingURL=pbx-api.service.js.map