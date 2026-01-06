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
        status: string;
        error_message: string | null;
        created_at: Date;
        id: number;
        crawl_date: Date;
        crawl_type: string;
        records_count: number;
        total_branches: number;
        total_customers: number;
        total_payments: number;
        total_treatments: number;
        total_services: number;
        duration_seconds: number | null;
    }[]>;
}
