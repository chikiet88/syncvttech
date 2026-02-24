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
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (branchID && branchID !== '0') {
      where.branch_id = parseInt(branchID);
    }

    if (dateFrom && dateTo) {
      // Input is DD-MM-YYYY, convert to Date
      const parseDate = (dStr: string) => {
        const [d, m, y] = dStr.split('-');
        return new Date(`${y}-${m}-${d}`);
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
            { branchID: branchID || "0", dateFrom, dateTo }
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
}
