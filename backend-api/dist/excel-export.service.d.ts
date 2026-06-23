import { PrismaService } from './prisma.service';
export declare class ExcelExportService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getFormattedAppointmentsData(dateFromStr: string, dateToStr: string, branchId?: string, sortOrder?: 'asc' | 'desc'): Promise<any[]>;
    exportAppointmentsToExcel(dateFromStr: string, dateToStr: string, branchId?: string): Promise<Buffer>;
    pushToGoogleSheet(dateFromStr: string, dateToStr: string): Promise<{
        tazaCount: number;
        timonaCount: number;
        url: string;
    }>;
    private getGoogleSheetsAccessToken;
    handleGoogleSheetPushCron22(): Promise<void>;
    handleGoogleSheetPushCron2330(): Promise<void>;
    handleGoogleSheetPushCron(): Promise<void>;
}
