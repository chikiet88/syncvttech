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
        data: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getTreatmentsDetails(branchId: string, from: string, to: string, page?: string, limit?: string): Promise<{
        data: {
            id: number;
            status: number;
            created_at: Date;
            branch_id: number | null;
            branch_name: string | null;
            service_id: number | null;
            service_name: string | null;
            customer_id: number | null;
            customer_name: string | null;
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
    getAppointmentsDetails(branchId: string, from: string, to: string, page?: string, limit?: string, q?: string): Promise<{
        data: {
            id: number;
            vttech_code: string;
            mlh_kh: string;
            appointment_date: Date | null;
            phone: string;
            note: string;
            status_name: string;
            branch_name: string;
            type_name: string;
            sale_time_date: string;
            source_name: string;
            customer_name: string;
            service_name: string;
            employee_name: string;
            status: number;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAnamnesisDetails(branchId: string, from: string, to: string, page?: string, limit?: string): Promise<{
        data: {
            id: number;
            date: Date | null;
            customerId: number;
            customerName: string;
            customerCode: string;
            phone: string;
            content: string;
            note: string;
            branchName: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getImagesDetails(branchId: string, from: string, to: string, page?: string, limit?: string): Promise<{
        data: {
            id: number;
            date: Date | null;
            customerId: number;
            customerName: string;
            customerCode: string;
            phone: string;
            folderName: string;
            imagesCount: number;
            branchName: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getCareHistoryDetails(branchId: string, from: string, to: string, page?: string, limit?: string): Promise<{
        data: {
            id: number;
            date: Date | null;
            customerId: number;
            customerName: string;
            customerCode: string;
            phone: string;
            actionType: string;
            note: string;
            employeeName: string;
            branchName: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getComplaintsDetails(branchId: string, from: string, to: string, page?: string, limit?: string): Promise<{
        data: {
            id: number;
            date: Date | null;
            customerId: number;
            customerName: string;
            customerCode: string;
            phone: string;
            content: string;
            statusName: string;
            branchName: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getTreatmentPlansDetails(branchId: string, from: string, to: string, page?: string, limit?: string): Promise<{
        data: {
            id: number;
            date: Date | null;
            customerId: number;
            customerName: string;
            customerCode: string;
            phone: string;
            serviceName: string;
            doctorName: string;
            note: string;
            branchName: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
