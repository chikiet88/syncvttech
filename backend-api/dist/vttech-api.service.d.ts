import { ConfigService } from '@nestjs/config';
export declare class VttechApiService {
    private configService;
    private readonly logger;
    private axiosInstance;
    private token;
    private secretKey;
    private cookies;
    private xsrfToken;
    private pageTokens;
    private baseUrl;
    private loginPromise;
    constructor(configService: ConfigService);
    private log;
    private updateCookies;
    login(force?: boolean): Promise<boolean>;
    getXsrfToken(page?: string, force?: boolean): Promise<string | null | undefined>;
    decompress(data: any): any;
    callHandler(page: string, handler: string, data: any): Promise<any>;
    callApi(url: string, data: any): Promise<any>;
    fetchExtensions(): Promise<any>;
    fetchTicketGroups(): Promise<any>;
    fetchCallHistory(dateFrom: string, dateTo: string): Promise<any>;
    private logCallback;
    setLogCallback(callback: (msg: string) => void): void;
    getRevenueByBranch(dateFrom: string, dateTo: string, branchId: number): Promise<any>;
}
