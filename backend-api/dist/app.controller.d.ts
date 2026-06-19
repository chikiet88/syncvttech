import { AppService } from './app.service';
import { SyncService } from './sync.service';
import { PbxSyncService } from './pbx-sync.service';
import { PrismaService } from './prisma.service';
import { VttechApiService } from './vttech-api.service';
import { ExcelExportService } from './excel-export.service';
export declare class AppController {
    private readonly appService;
    private readonly syncService;
    private readonly pbxSync;
    private readonly prisma;
    private readonly vttechApi;
    private readonly excelExportService;
    constructor(appService: AppService, syncService: SyncService, pbxSync: PbxSyncService, prisma: PrismaService, vttechApi: VttechApiService, excelExportService: ExcelExportService);
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
        status: string | null;
        error_message: string | null;
        created_at: Date;
        branch_id: number | null;
        records_count: number | null;
        appointments_count: number;
        customers_count: number;
        revenue_total: number;
        sales_total: number;
        services_count: number;
        treatments_count: number;
        task_id: string | null;
        crawl_date: Date | null;
        crawl_type: string | null;
        message: string | null;
        duration_seconds: number | null;
        total_branches: number | null;
        total_services: number | null;
        total_customers: number | null;
        total_payments: number | null;
        total_treatments: number | null;
    }[]>;
    getPbxLogs(limit?: string): Promise<{
        id: number;
        updated_at: Date;
        sync_type: string;
        status: string;
        start_time: Date;
        end_time: Date | null;
        date_from: Date;
        date_to: Date;
        total_records: number;
        success_count: number;
        failed_count: number;
        retry_count: number;
        error_message: string | null;
        failed_items: import("@prisma/client/runtime/library").JsonValue | null;
        created_at: Date;
    }[]>;
    getSyncStatus(): Promise<{
        queueCounts: any;
        taskSummary: {
            pending: number;
            processing: number;
            success: number;
            failed: number;
        };
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
        name: string;
        id: number;
        updated_at: Date;
        created_at: Date;
        is_active: number;
        code: string | null;
        email: string | null;
        phone: string | null;
        address: string | null;
        city_id: number | null;
        district_id: number | null;
    }[]>;
    getCronConfigs(): Promise<{
        last_success_at: any;
        recent_tasks: any[];
        name: string;
        id: string;
        enabled: boolean;
        description: string | null;
        updated_at: Date;
    }[]>;
    updateCronConfig(id: string, body: {
        enabled: boolean;
    }): Promise<{
        name: string;
        id: string;
        enabled: boolean;
        description: string | null;
        updated_at: Date;
    }>;
    exportAppointments(from: string, to: string, branchId: string, res: any): Promise<any>;
    pushGoogleSheet(from: string, to: string, res: any): Promise<any>;
    syncTabManual(body: {
        tabId: string;
        fromDate: string;
        toDate: string;
    }): Promise<{
        pushed: number;
        success: boolean;
        message: string;
    }>;
}
