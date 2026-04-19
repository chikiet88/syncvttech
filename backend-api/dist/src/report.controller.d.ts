import { VttechApiService } from './vttech-api.service';
import { PrismaService } from './prisma.service';
export declare class ReportController {
    private vttechApi;
    private prisma;
    private readonly logger;
    constructor(vttechApi: VttechApiService, prisma: PrismaService);
    getRevenue(branchID: string, dateFrom: string, dateTo: string, search?: string, page?: string, limit?: string, sortBy?: string, sortOrder?: 'asc' | 'desc', serviceOnly?: string): Promise<{
        Table: any;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getBranchSummary(dateFrom: string, dateTo: string): Promise<{
        id: number;
        name: string;
        customerCount: number;
        serviceCount: any;
        treatmentCount: number;
        appointmentCount: number;
        totalSales: any;
        totalRevenue: any;
    }[]>;
    getCustomersDetails(branchId: string, from: string, to: string, type?: string, page?: string, limit?: string): Promise<{
        data: any;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getTreatmentsDetails(branchId: string, from: string, to: string, page?: string, limit?: string): Promise<{
        data: {
            status: number;
            created_at: Date;
            id: number;
            branch_id: number | null;
            branch_name: string | null;
            customer_id: number | null;
            customer_name: string | null;
            service_id: number | null;
            service_name: string | null;
            amount: number;
            paid: number;
            employee_id: number | null;
            employee_name: string | null;
            note: string | null;
            treatment_date: Date | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAppointmentsDetails(branchId: string, from: string, to: string, page?: string, limit?: string): Promise<{
        data: {
            status: number;
            created_at: Date;
            updated_at: Date;
            id: number;
            phone: string | null;
            branch_id: number | null;
            branch_name: string | null;
            customer_id: number | null;
            customer_name: string | null;
            service_id: number | null;
            service_name: string | null;
            employee_id: number | null;
            employee_name: string | null;
            appointment_date: Date | null;
            note: string | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
