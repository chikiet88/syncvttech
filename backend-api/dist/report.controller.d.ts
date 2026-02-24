import { VttechApiService } from './vttech-api.service';
import { PrismaService } from './prisma.service';
export declare class ReportController {
    private vttechApi;
    private prisma;
    constructor(vttechApi: VttechApiService, prisma: PrismaService);
    getRevenue(branchID: string, dateFrom: string, dateTo: string, search?: string, page?: string, limit?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        Table: any;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
