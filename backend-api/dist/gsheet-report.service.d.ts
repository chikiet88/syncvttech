import { PrismaService } from './prisma.service';
export declare class GsheetReportService {
    private readonly prisma;
    private readonly logger;
    private readonly SPREADSHEET_ID;
    private readonly BATCH_SIZE;
    constructor(prisma: PrismaService);
    handleDailyGsheetReportCron(): Promise<void>;
    getReports(limit?: number): Promise<{
        id: number;
        status: string;
        created_at: Date;
        report_date: Date;
        total_db: number;
        total_sheet: number;
        diff: number;
        report_content: string;
    }[]>;
    getReportById(id: number): Promise<{
        id: number;
        status: string;
        created_at: Date;
        report_date: Date;
        total_db: number;
        total_sheet: number;
        diff: number;
        report_content: string;
    } | null>;
    compareAndPushData(): Promise<{
        reportId: number;
        totalDb: number;
        totalSheet: number;
        difference: number;
        markdown: string;
    }>;
    private formatDateTime;
}
