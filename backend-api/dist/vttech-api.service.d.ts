import { ConfigService } from '@nestjs/config';
export declare class VttechApiService {
    private configService;
    private readonly logger;
    private axiosInstance;
    private token;
    private xsrfToken;
    private cookies;
    private logCallback?;
    constructor(configService: ConfigService);
    setLogCallback(callback: (msg: string) => void): void;
    private log;
    private updateCookies;
    login(): Promise<boolean>;
    getXsrfToken(): Promise<string | null>;
    decompress(data: string, context?: string): any;
    callHandler(page: string, handler: string, data?: any): Promise<any>;
    callApi(endpoint: string, data?: any): Promise<any>;
    fetchExtensions(): Promise<any>;
    fetchTicketGroups(): Promise<any>;
}
