import { ConfigService } from '@nestjs/config';
export declare class PbxApiService {
    private configService;
    private readonly logger;
    private readonly apiUrl;
    private readonly domain;
    private readonly apiKey;
    constructor(configService: ConfigService);
    private getHeaders;
    fetchCdrRecords(dateFrom: string, dateTo: string, offset?: number): Promise<any>;
    fetchAllCdrRecords(dateFrom: string, dateTo: string): Promise<any[]>;
}
