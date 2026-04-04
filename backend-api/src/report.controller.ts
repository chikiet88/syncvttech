import { Controller, Get, Query, Logger } from '@nestjs/common';
import { VttechApiService } from './vttech-api.service';
import { PrismaService } from './prisma.service';

@Controller('reports')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

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

    if (dateFrom && dateTo) {
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
        try {
            await this.vttechApi.login();
            
            const toVTTechDate = (d: string) => {
                if (!d) return '';
                if (d.includes('-') && d.split('-')[0].length === 4) {
                    const [y, m, d_] = d.split('-');
                    return `${d_}-${m}-${y}`;
                }
                return d.replace(/\//g, '-');
            };

            const vtDateFrom = toVTTechDate(dateFrom);
            const vtDateTo = toVTTechDate(dateTo);
            
            this.logger.log(`📡 Live fetching revenue from VTTech: Branch ${branchID}, Range ${vtDateFrom} to ${vtDateTo}`);
            
            const res = await this.vttechApi.callHandler(
                '/Report/Revenue/Branch/AllBranchGrid/',
                'LoadataDetailByBranch',
                { branchID: branchID || "0", dateFrom: vtDateFrom, dateTo: vtDateTo }
            );
            
            const table = res?.Table || [];
            if (table.length > 0) {
                this.logger.log(`✅ Live fetch success: Found ${table.length} revenue records.`);
                transactions = table.map((item: any, idx: number) => ({
                    id: idx,
                    customer_name: item.CustName,
                    customer_code: item.CustCode,
                    phone: null,
                    service_name: item.ServiceName || item.Service,
                    service_id: item.ServiceID ? parseInt(item.ServiceID) : (item.Service ? parseInt(item.Service) : null),
                    amount: parseFloat(String(item.Amount || 0).replace(/[^0-9.-]+/g, '')),
                    paid: parseFloat(String(item.Paid || 0).replace(/[^0-9.-]+/g, '')),
                    is_new: parseInt(item.IsNew || 0),
                    created_at: item.Created || item.Date,
                    branch_id: parseInt(item.BranchID || branchID),
                }));
                total = transactions.length;
            }
        } catch (e) {
            this.logger.error(`Live Fetch Revenue Error: ${e.message}`);
        }
    }

    const [services, branches, serviceGroups] = await Promise.all([
      this.prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
      this.prisma.branch.findMany({ select: { id: true, name: true } }),
      this.prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
    ]);

    const serviceMap = new Map(services.map(s => [s.id, s]));
    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    const groupMap = new Map(serviceGroups.map(g => [g.id, g.name]));

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
            CategoryName: groupName || "Khác",
            BranchName: branchMap.get(item.branch_id) || `CN #${item.branch_id}`,
            Created: item.created_at,
        };
    });

    return {
      Table: detailedData,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }

  @Get('branches')
  async getBranchSummary(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
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
    
    const start = parseDate(dateFrom);
    const end = parseDate(dateTo);
    end.setHours(23, 59, 59, 999);

    const branches = await this.prisma.branch.findMany({
      where: { is_active: 1 },
      orderBy: { id: 'asc' }
    });

    const summaries = await Promise.all(branches.map(async (branch) => {
      const [
        customerCount,
        serviceCount,
        treatmentCount,
        appointmentCount,
        revenueAgg
      ] = await Promise.all([
        (this.prisma as any).dailyCustomer.count({
          where: { branch_id: branch.id, date: { gte: start, lte: end } }
        }),
        (this.prisma as any).revenueTransaction.count({
          where: { branch_id: branch.id, date: { gte: start, lte: end }, service_id: { not: null } }
        }),
        this.prisma.treatment.count({
          where: { branch_id: branch.id, treatment_date: { gte: start, lte: end } }
        }),
        this.prisma.appointment.count({
          where: { branch_id: branch.id, appointment_date: { gte: start, lte: end } }
        }),
        (this.prisma as any).revenueTransaction.aggregate({
          where: { branch_id: branch.id, date: { gte: start, lte: end } },
          _sum: { amount: true, paid: true }
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
    @Query('type') type?: string,
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

    let [data, total] = await Promise.all([
      (this.prisma as any).dailyCustomer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { date: 'desc' },
      }),
      (this.prisma as any).dailyCustomer.count({ where }),
    ]);

    if (total === 0 && pageNum === 1 && branchId && branchId !== '0') {
        try {
            await this.vttechApi.login();
            const yyyy = start.getFullYear();
            const mm = String(start.getMonth() + 1).padStart(2, '0');
            const dd = String(start.getDate()).padStart(2, '0');
            const formattedDate = `${yyyy}-${mm}-${dd} 00:00:00`;
            
            const fetchType = type ? parseInt(type) : 1;
            this.logger.log(`📡 Live fetching customers: Branch ${branchId}, Date ${formattedDate}, Type ${fetchType}`);
            
            let res = await this.vttechApi.callHandler(
                '/Customer/ListCustomer/',
                'LoadData',
                { branchID: branchId, dateFrom: formattedDate, dateTo: formattedDate, type: fetchType }
            );

            let table = res?.Table || [];
            if (table.length === 0 && !type) {
                this.logger.log(`   🔸 No results for Type 1, trying Type 2 (Activity)...`);
                res = await this.vttechApi.callHandler(
                    '/Customer/ListCustomer/',
                    'LoadData',
                    { branchID: branchId, dateFrom: formattedDate, dateTo: formattedDate, type: 2 }
                );
                table = res?.Table || [];
            }

            if (table.length > 0) {
                this.logger.log(`✅ Live fetch success: Found ${table.length} customers.`);
                data = table.map((item: any, idx: number) => ({
                    id: `live-${idx}`,
                    customer_id: parseInt(item.CustID || item.ID),
                    customer_name: item.CustName || item.FullName,
                    customer_code: item.CustCode || item.Code,
                    phone: item.Phone || item.Mobile,
                    date: start,
                    branch_id: parseInt(branchId),
                }));
                total = data.length;
            }
        } catch (e) {
            this.logger.error(`Live Fetch Registrations Error: ${e.message}`);
        }
    }

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
