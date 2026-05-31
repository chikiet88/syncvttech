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
        accounts: number;
        details: {
            username: string;
            success: boolean;
        }[];
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
    resetQueue(): Promise<{
        success: boolean;
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
        created_at: Date;
        branch_id: number | null;
        status: string | null;
        task_id: string | null;
        crawl_date: Date | null;
        crawl_type: string | null;
        message: string | null;
        records_count: number | null;
        customers_count: number;
        services_count: number;
        treatments_count: number;
        appointments_count: number;
        sales_total: number;
        revenue_total: number;
        duration_seconds: number | null;
        total_branches: number | null;
        total_services: number | null;
        total_customers: number | null;
        total_payments: number | null;
        total_treatments: number | null;
        error_message: string | null;
    }[]>;
    getPbxLogs(limit?: string): Promise<{
        id: number;
        created_at: Date;
        updated_at: Date;
        status: string;
        error_message: string | null;
        sync_type: string;
        start_time: Date;
        end_time: Date | null;
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
    seedTasks(from: string, to: string): Promise<{
        created: number;
        skipped: number;
        message: string;
    }>;
    startTasks(limit?: string): Promise<{
        pushed: number;
        message: string;
    }>;
    getTasksSummary(): Promise<{
        total: number;
        success: number;
        progress: number;
        details: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.SyncTaskGroupByOutputType, "status"[]> & {
            _count: {
                _all: number;
            };
        })[];
        detailProgress: {
            total: any;
            completed: any;
            percentage: number;
        };
        stats: {
            customers: any;
            appointments: any;
            services: any;
            treatments: any;
            sales: any;
            revenue: any;
        };
    }>;
    getBranches(): Promise<{
        id: number;
        code: string | null;
        name: string;
        address: string | null;
        phone: string | null;
        email: string | null;
        city_id: number | null;
        district_id: number | null;
        is_active: number;
        created_at: Date;
        updated_at: Date;
    }[]>;
    getCronConfigs(): Promise<{
        id: string;
        name: string;
        updated_at: Date;
        enabled: boolean;
        description: string | null;
    }[]>;
    updateCronConfig(id: string, body: {
        enabled: boolean;
    }): Promise<{
        id: string;
        name: string;
        updated_at: Date;
        enabled: boolean;
        description: string | null;
    }>;
}
