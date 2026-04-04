import { AppService } from './app.service';
import { SyncService } from './sync.service';
import { PbxSyncService } from './pbx-sync.service';
import { PrismaService } from './prisma.service';
import { VttechApiService } from './vttech-api.service';
export declare class AppController {
    private readonly appService;
    private readonly syncService;
    private readonly pbxSync;
    private readonly prisma;
    private readonly vttechApi;
    constructor(appService: AppService, syncService: SyncService, pbxSync: PbxSyncService, prisma: PrismaService, vttechApi: VttechApiService);
    checkLogin(user?: string, pass?: string): Promise<{
        success: boolean;
        message: string;
        user: string | undefined;
    }>;
    getHello(): string;
    triggerSync(from?: string, to?: string, date?: string, forceMaster?: string, syncPbx?: string, syncDetails?: string): Promise<{
        message: string;
        status: string;
    }>;
    triggerRevenueSync(from?: string, to?: string, date?: string): Promise<{
        message: string;
        status: string;
    }>;
    stopSync(): Promise<{
        message: string;
    }>;
    triggerPbxSync(from?: string, to?: string, date?: string): Promise<{
        message: string;
        status: string;
    }>;
    triggerPbxMasterSync(): Promise<{
        message: string;
    }>;
    getCrawlLogs(limit?: string): Promise<{
        id: number;
        crawl_date: Date;
        crawl_type: string;
        status: string;
        records_count: number;
        total_branches: number;
        total_customers: number;
        total_payments: number;
        total_treatments: number;
        total_services: number;
        error_message: string | null;
        duration_seconds: number | null;
        created_at: Date;
    }[]>;
    getPbxLogs(limit?: string): Promise<{
        id: number;
        status: string;
        error_message: string | null;
        created_at: Date;
        updated_at: Date;
        start_time: Date;
        end_time: Date | null;
        sync_type: string;
        date_from: Date;
        date_to: Date;
        total_records: number;
        success_count: number;
        failed_count: number;
        retry_count: number;
        failed_items: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    getSyncStatus(): Promise<{
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
    }>;
    getBranches(): Promise<{
        id: number;
        created_at: Date;
        name: string;
        code: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        city_id: number | null;
        district_id: number | null;
        is_active: number;
        updated_at: Date;
    }[]>;
}
