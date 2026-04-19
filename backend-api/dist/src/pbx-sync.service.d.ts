import { PrismaService } from './prisma.service';
import { PbxApiService } from './pbx-api.service';
import { VttechApiService } from './vttech-api.service';
export declare class PbxSyncService {
    private prisma;
    private pbxApi;
    private vttechApi;
    private readonly logger;
    constructor(prisma: PrismaService, pbxApi: PbxApiService, vttechApi: VttechApiService);
    handleDailyPbxSync(): Promise<void>;
    syncCdr(dateFrom: string, dateTo: string): Promise<{
        total: number;
        success: number;
        failed: number;
    }>;
    syncExtensions(): Promise<number>;
    syncPbxEmployees(): Promise<number>;
    syncVttechCallHistory(dateFrom: string, dateTo: string): Promise<{
        total: number;
        success: number;
        failed: number;
    }>;
}
