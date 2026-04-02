import { Controller, Get, Query } from '@nestjs/common';
import { VttechApiService } from './vttech-api.service';
import { PrismaService } from './prisma.service';

@Controller('reports')
export class ReportController {
  constructor(
    private vttechApi: VttechApiService,
    private prisma: PrismaService,
  ) {}

  @Get('revenue')
  async getRevenue(
    @Query('branchID') branchID: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('q') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('sortBy') sortBy: string = 'created_at',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('service_only') serviceOnly?: string,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (serviceOnly === 'true') {
      where.service_id = { not: null };
    }

    if (branchID && branchID !== '0') {
      where.branch_id = parseInt(branchID);
    }

    if (dateFrom && dateTo) {
      // Input is DD-MM-YYYY, convert to Date
      const parseDate = (dStr: string) => {
        if (!dStr) return new Date();
        const separator = dStr.includes('/') ? '/' : '-';
        const parts = dStr.split(separator);
        if (parts.length === 3) {
            // Assume DD-MM-YYYY or YYYY-MM-DD
            if (parts[0].length === 4) return new Date(dStr);
            const [d, m, y] = parts;
            return new Date(`${y}-${m}-${d}`);
        }
        return new Date(dStr);
      };
      
      const start = parseDate(dateFrom);
      const end = parseDate(dateTo);
      end.setHours(23, 59, 59, 999);

      where.date = {
        gte: start,
        lte: end,
      };
    }

    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: 'insensitive' } },
        { customer_code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { service_name: { contains: search, mode: 'insensitive' } },
        { doc_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Query DB
    let [transactions, total] = await Promise.all([
      (this.prisma as any).revenueTransaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
      }),
      (this.prisma as any).revenueTransaction.count({ where }),
    ]);

    // Fallback if DB is empty for this range: try live fetch
    if (total === 0 && !search && pageNum === 1) {
        await this.vttechApi.login();
        await this.vttechApi.getXsrfToken();
        const res = await this.vttechApi.callHandler(
            '/Report/Revenue/Branch/AllBranchGrid/',
            'LoadataDetailByBranch',
            { branchID: branchID || "0", dateFrom: dateFrom, dateTo: dateTo }
        );
        
        const table = res?.Table || [];
        if (table.length > 0) {
            // Return live data immediately to fix the "not loading" bug
            transactions = table.map((item: any, idx: number) => ({
                id: idx,
                customer_name: item.CustName,
                customer_code: item.CustCode,
                phone: null, // Phone not in Table, requires detailed sync
                service_name: null,
                service_id: item.Service ? parseInt(item.Service) : null,
                amount: parseFloat(item.Amount),
                paid: parseFloat(item.Paid),
                is_new: parseInt(item.IsNew),
                created_at: item.Created,
                branch_id: item.BranchID,
            }));
            total = transactions.length;
        }
    }

    // Map names from local DB for accuracy (though already partially stored)
    const [services, branches, serviceGroups] = await Promise.all([
      this.prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
      this.prisma.branch.findMany({ select: { id: true, name: true } }),
      this.prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
    ]);

    const serviceMap = new Map(services.map(s => [s.id, s]));
    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    const groupMap = new Map(serviceGroups.map(g => [g.id, g.name]));

    // Fetch phones from Customer table for these transactions
    const customerIds = [...new Set(transactions.map((t: any) => t.customer_id).filter(Boolean))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds as number[] } },
      select: { id: true, phone: true }
    });
    const phoneMap = new Map(customers.map(c => [c.id, c.phone]));

    const detailedData = transactions.map((item: any) => {
        const service = item.service_id ? serviceMap.get(item.service_id) : null;
        const groupName = service?.group_id ? groupMap.get(service.group_id) : null;
        
        return {
            ...item,
            CustomerName: item.customer_name || "N/A",
            CustomerCode: item.customer_code || "",
            Phone: item.phone || phoneMap.get(item.customer_id) || "",
            ServiceName: service?.name || item.service_name || `Dịch vụ #${item.service_id}`,
            CategoryName: groupName || item.category_name || "Khác",
            BranchName: branchMap.get(item.branch_id) || item.branch_name || `CN #${item.branch_id}`,
            Created: item.created_at,
            Amount: item.amount,
            Paid: item.paid,
            IsNew: item.is_new,
        };
    });

    return {
      Table: detailedData,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      }
    };
  }

  @Get('branches')
  async getBranchSummary(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    // Parse dates (Input format: DD-MM-YYYY)
    const parseDate = (dStr: string) => {
      if (!dStr) return new Date();
      const [d, m, y] = dStr.split('-');
      return new Date(`${y}-${m}-${d}`);
    };
    
    const start = parseDate(dateFrom);
    const end = parseDate(dateTo);
    end.setHours(23, 59, 59, 999);

    // Get all branches
    const branches = await this.prisma.branch.findMany({
      where: { is_active: 1 },
      orderBy: { id: 'asc' }
    });

    const summaries = await Promise.all(branches.map(async (branch) => {
      // Aggregate data for this branch in range
      const [
        customerCount,
        serviceCount,
        treatmentCount,
        appointmentCount,
        revenueAgg
      ] = await Promise.all([
        // Count distinct customers using dailyCustomer activity tracking
        (this.prisma as any).dailyCustomer.count({
          where: {
            branch_id: branch.id,
            date: { gte: start, lte: end }
          }
        }),
        // Count services in revenue transactions
        (this.prisma as any).revenueTransaction.count({
          where: {
            branch_id: branch.id,
            date: { gte: start, lte: end },
            service_id: { not: null }
          }
        }),
        // Count treatments
        this.prisma.treatment.count({
          where: {
            branch_id: branch.id,
            treatment_date: { gte: start, lte: end }
          }
        }),
        // Count appointments
        this.prisma.appointment.count({
          where: {
            branch_id: branch.id,
            appointment_date: { gte: start, lte: end }
          }
        }),
        // Sum amount and paid from revenueTransactions
        (this.prisma as any).revenueTransaction.aggregate({
          where: {
            branch_id: branch.id,
            date: { gte: start, lte: end }
          },
          _sum: {
            amount: true,
            paid: true
          }
        })
      ]);

      return {
        id: branch.id,
        name: branch.name,
        customerCount: customerCount || 0,
        serviceCount: serviceCount || 0,
        treatmentCount: treatmentCount || 0,
        appointmentCount: appointmentCount || 0,
        totalSales: revenueAgg._sum?.amount || 0,
        totalRevenue: revenueAgg._sum?.paid || 0,
      };
    }));

    return summaries;
  }

  @Get('customers/details')
  async getCustomersDetails(
    @Query('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const parseDate = (dStr: string) => {
      if (!dStr) return new Date();
      const separator = dStr.includes('/') ? '/' : '-';
      const parts = dStr.split(separator);
      if (parts.length === 3) {
          if (parts[0].length === 4) return new Date(dStr);
          const [d, m, y] = parts;
          return new Date(`${y}-${m}-${d}`);
      }
      return new Date(dStr);
    };

    const start = parseDate(from || '');
    const end = parseDate(to || '');
    end.setHours(23, 59, 59, 999);

    const where: any = { date: { gte: start, lte: end } };
    if (branchId && branchId !== '0') where.branch_id = parseInt(branchId);

    // Query DB
    let [data, total] = await Promise.all([
      (this.prisma as any).dailyCustomer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { date: 'desc' },
      }),
      (this.prisma as any).dailyCustomer.count({ where }),
    ]);

    /**
     * FALLBACK: Nếu DB trống cho ngày hôm nay/ngày được chọn, thử Live Fetch từ Portal
     */
    if (total === 0 && pageNum === 1 && branchId && branchId !== '0') {
        const dateObj = start;
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd} 00:00:00`;
        
        try {
            await this.vttechApi.login();
            const res = await this.vttechApi.callHandler(
                '/Customer/ListCustomer/',
                'LoadData',
                { branchID: branchId, dateFrom: formattedDate, dateTo: formattedDate, type: 5 }
            );

            const table = res?.Table || [];
            if (table.length > 0) {
                data = table.map((item: any, idx: number) => ({
                    id: `live-${idx}`,
                    customer_id: parseInt(item.CustID),
                    customer_name: item.CustName,
                    customer_code: item.CustCode,
                    phone: item.Phone,
                    date: start,
                    branch_id: parseInt(branchId),
                }));
                total = data.length;
            }
        } catch (e) {
            console.error('Live Fetch Registrations Error:', e.message);
        }
    }

    // Map names from Customer table
    const customerIds = [...new Set(data.map((t: any) => t.customer_id).filter(Boolean))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds as number[] } },
      select: { id: true, name: true, code: true, phone: true }
    });
    const customerMap = new Map(customers.map(c => [c.id, c]));

    const mappedData = data.map((item: any) => {
      const c = customerMap.get(item.customer_id);
      return {
        id: item.id,
        date: item.date,
        customerId: item.customer_id,
        customerName: c?.name || item.customer_name || 'N/A',
        customerCode: c?.code || '',
        phone: c?.phone || item.phone || '',
        branchId: item.branch_id,
      };
    });

    return {
      data: mappedData,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }

  @Get('treatments/details')
  async getTreatmentsDetails(
    @Query('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const parseDate = (dStr: string) => {
      if (!dStr) return new Date();
      const [d, m, y] = dStr.split('-');
      return new Date(`${y}-${m}-${d}`);
    };

    const start = parseDate(from || '');
    const end = parseDate(to || '');
    end.setHours(23, 59, 59, 999);

    const where: any = { treatment_date: { gte: start, lte: end } };
    if (branchId && branchId !== '0') where.branch_id = parseInt(branchId);

    const [data, total] = await Promise.all([
      this.prisma.treatment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { treatment_date: 'desc' },
      }),
      this.prisma.treatment.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }

  @Get('appointments/details')
  async getAppointmentsDetails(
    @Query('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const parseDate = (dStr: string) => {
      if (!dStr) return new Date();
      const [d, m, y] = dStr.split('-');
      return new Date(`${y}-${m}-${d}`);
    };

    const start = parseDate(from || '');
    const end = parseDate(to || '');
    end.setHours(23, 59, 59, 999);

    const where: any = { appointment_date: { gte: start, lte: end } };
    if (branchId && branchId !== '0') where.branch_id = parseInt(branchId);

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { appointment_date: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }
}
