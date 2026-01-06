import { VttechApiService } from './vttech-api.service';
import { PrismaService } from './prisma.service';
import { PbxSyncService } from './pbx-sync.service';
export declare class SyncService {
    private vttechApi;
    private prisma;
    private pbxSync;
    private readonly logger;
    private syncStatus;
    constructor(vttechApi: VttechApiService, prisma: PrismaService, pbxSync: PbxSyncService);
    getSyncStatus(): {
        isSyncing: boolean;
        progress: number;
        total: number;
        current: number;
        message: string;
        logs: string[];
        startTime: number | null;
        endTime: number | null;
        error: string | null;
        shouldStop: boolean;
    };
    stopSync(): void;
    private addLog;
    private ensureArray;
    handleDailySync(): Promise<void>;
    syncByRange(dateFrom: string, dateTo: string, forceMaster?: boolean, syncPbx?: boolean, syncDetails?: boolean): Promise<void>;
    syncByDate(dateStr: string): Promise<void>;
    private syncCustomers;
    private syncAppointments;
    private syncAllCustomerDetails;
    private syncMasterData;
    private syncSingleCustomerDetail;
    getLogs(limit?: number): Promise<{
        id: number;
        crawl_date: Date;
        crawl_type: string;
        status: string;
        records_count: number;
        error_message: string | null;
        duration_seconds: number | null;
        created_at: Date;
    }[]>;
}
