import { ConfigService } from '@nestjs/config';
export declare class VttechApiService {
    private configService;
    private readonly logger;
    private axiosInstance;
    private token;
    private secretKey;
    private cookies;
    private xsrfToken;
    private baseUrl;
    private loginPromise;
    private logCallback;
    constructor(configService: ConfigService);
    private log;
    setLogCallback(cb: (msg: string) => void): void;
    private updateCookies;
    private ensureCookie;
    private followRedirects;
    login(force?: boolean): Promise<boolean>;
    getXsrfToken(page?: string, force?: boolean): Promise<string | null>;
    decompress(data: any): any;
    private formatDate;
    private buildFormBody;
    private handlerHeaders;
    callHandler(page: string, handler: string, data: any): Promise<any>;
    callApi(url: string, data: any): Promise<any>;
    checkLoginStatus(u?: string, p?: string): Promise<{
        success: boolean;
        message: string;
        user: string | undefined;
    }>;
    fetchExtensions(): Promise<any>;
    fetchTicketGroups(): Promise<any>;
    fetchCallHistory(dateFrom: string, dateTo: string): Promise<any>;
    getRevenueByBranch(dateFrom: string, dateTo: string, branchId: number): Promise<any>;
}
