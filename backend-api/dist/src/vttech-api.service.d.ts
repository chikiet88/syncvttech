import { ConfigService } from '@nestjs/config';
interface VttechSession {
    username: string;
    password: string;
    token: string | null;
    secretKey: string | null;
    cookies: string[];
    xsrfToken: string | null;
    lastUsedAt: number;
    loginByUsernamePromise: Promise<boolean> | null;
}
export declare class VttechApiService {
    private configService;
    private readonly logger;
    private axiosInstance;
    private sessions;
    private currentSessionIndex;
    private baseUrl;
    private logCallback;
    constructor(configService: ConfigService);
    private createNewSession;
    private updateSessionCookies;
    private ensureSessionCookie;
    private getBestSession;
    private delayForSession;
    private log;
    setLogCallback(cb: (msg: string) => void): void;
    private followRedirects;
    login(session?: VttechSession, force?: boolean): Promise<boolean>;
    getXsrfToken(session?: VttechSession, page?: string, force?: boolean): Promise<string | null>;
    decompress(data: any): any;
    private buildFormBody;
    private handlerHeaders;
    callHandler(page: string, handler: string, data: any, username?: string): Promise<any>;
    callApi(url: string, data: any): Promise<any>;
    checkLoginStatus(): Promise<{
        success: boolean;
        message: string;
        accounts: number;
    }>;
    fetchExtensions(): Promise<any>;
    fetchTicketGroups(): Promise<any>;
    fetchCallHistory(dateFrom: string, dateTo: string): Promise<any>;
    getRevenueByBranch(dateFrom: string, dateTo: string, branchId: number): Promise<any>;
}
export {};
