import { PrismaService } from './prisma.service';
export declare class ExcelExportService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getFormattedAppointmentsData(dateFromStr: string, dateToStr: string, branchId?: string, sortOrder?: 'asc' | 'desc', allAppointments?: boolean): Promise<any[]>;
    exportAppointmentsToExcel(dateFromStr: string, dateToStr: string, branchId?: string): Promise<Buffer>;
    pushToGoogleSheet(dateFromStr: string, dateToStr: string, spreadsheetId?: string, allAppointments?: boolean, shouldDuplicateBackup?: boolean): Promise<{
        tazaCount: number;
        timonaCount: number;
        url: string;
    }>;
    private getGoogleSheetsAccessToken;
    handleGoogleSheetPushCron22(): Promise<void>;
    handleGoogleSheetPushCron2330(): Promise<void>;
    handleGoogleSheetPushCron(shouldDuplicateBackup?: boolean): Promise<void>;
}
