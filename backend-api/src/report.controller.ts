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
                    amount: parseFloat(String(item.PriceDiscounted || item.Price_Treat || item.Amount || 0).replace(/[^0-9.-]+/g, '')),
                    paid: parseFloat(String(item.Paid || item.AmountPaid || item.Amount || 0).replace(/[^0-9.-]+/g, '')),
                    is_new: parseInt(item.IsNew || 0),
                    created_at: item.Created || item.Date,
                    branch_id: parseInt(item.BranchID || branchID),
                }));
                total = transactions.length;
            }
        } catch (error: any) {
            this.logger.error(`Live Fetch Revenue Error: ${error.message}`);
        }
    }

    const [services, branches, groups] = await Promise.all([
      this.prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
      this.prisma.branch.findMany({ select: { id: true, name: true } }),
      this.prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
    ]);

    const serviceMap = new Map(services.map(s => [s.id, s]));
    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    const groupMap = new Map(groups.map(g => [g.id, g.name]));

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

    // 1. Fetch live summary from VTTech for 100% accuracy on Sales/Revenue
    // Sử dụng handler Loadata và branchID: 0 để lấy tổng hợp tất cả chi nhánh
    const vttechSummary = await this.vttechApi.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'Loadata', {
      branchID: 0,
      dateFrom: dateFrom,
      dateTo: dateTo
    });

    const summaries = await Promise.all(branches.map(async (branch) => {
      // Find matching branch in VTTech summary
      const vtBranch = vttechSummary.Table?.find((t: any) => t.BranchID === branch.id);
      
      const [
        customersCountResult,
        appointmentsCount,
        treatmentsCount,
        servicesCount
      ] = await Promise.all([
        // Count unique customer IDs across multiple tables for this branch and date range
        (this.prisma as any).$queryRaw<{ count: bigint }[]>`
          SELECT count(DISTINCT customer_id) as "count" 
          FROM revenue_transactions 
          WHERE branch_id = ${branch.id} 
              AND date >= ${start} 
              AND date <= ${end}
          `,
        this.prisma.appointment.count({
          where: { branch_id: branch.id, appointment_date: { gte: start, lte: end } }
        }),
        this.prisma.treatment.count({
          where: { branch_id: branch.id, treatment_date: { gte: start, lte: end } }
        }),
        (this.prisma as any).revenueTransaction.count({
          where: { branch_id: branch.id, date: { gte: start, lte: end }, service_id: { not: null } }
        }),
      ]);

      const customerCount = Number(customersCountResult[0]?.count || 0);

      return {
        id: branch.id,
        name: branch.name,
        customerCount: customerCount,
        serviceCount: servicesCount || 0,
        treatmentCount: treatmentsCount || 0,
        appointmentCount: appointmentsCount || 0,
        totalSales: vtBranch ? (vtBranch.TotalPriceDiscounted || 0) : 0,
        totalRevenue: vtBranch ? (vtBranch.Amount || 0) : 0,
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
      select: {
        id: true,
        name: true,
        code: true,
        phone: true,
        created_at: true,
        source: { select: { name: true } }
      }
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
        sourceName: c?.source?.name || 'Khách Giới Thiệu',
        createdAt: c?.created_at || item.created_at || null,
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
    @Query('q') q?: string,
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

    const where: any = {};
    const whereAndConditions: any[] = [];

    if (!q) {
      whereAndConditions.push({ appointment_date: { gte: start, lte: end } });
    }

    if (branchId === 'taza') {
      whereAndConditions.push({
        branch: {
          name: { contains: 'Taza', mode: 'insensitive' },
        },
      });
    } else if (branchId === 'timona') {
      whereAndConditions.push({
        branch: {
          name: { contains: 'Timona', mode: 'insensitive' },
        },
      });
    } else if (branchId && branchId !== '0') {
      whereAndConditions.push({ branch_id: parseInt(branchId) });
    } else {
      whereAndConditions.push({
        branch: {
          OR: [
            { name: { contains: 'Taza', mode: 'insensitive' } },
            { name: { contains: 'Timona', mode: 'insensitive' } },
          ],
        },
      });
    }

    if (q) {
      whereAndConditions.push({
        OR: [
          { customer_name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { note: { contains: q, mode: 'insensitive' } },
          { vttech_code: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    // Status "Ra Về" filter
    whereAndConditions.push({
      OR: [
        { status_name: { contains: 'Ra Về', mode: 'insensitive' } },
        {
          AND: [
            { OR: [{ status_name: null }, { status_name: '' }] },
            { OR: [{ status: 2 }, { status: 4 }] }
          ]
        }
      ]
    });

    // Type "Tư vấn" filter
    whereAndConditions.push({
      OR: [
        { type_name: { contains: 'tư vấn', mode: 'insensitive' } },
        {
          AND: [
            { OR: [{ type_name: null }, { type_name: '' }] },
            { service_name: { contains: 'tư vấn', mode: 'insensitive' } }
          ]
        }
      ]
    });

    where.AND = whereAndConditions;

    const [appointments, total, services, groups] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          customer: {
            include: {
              source: true,
            },
          },
          branch: true,
        },
        orderBy: { appointment_date: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
      this.prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
      this.prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
    ]);

    const serviceMap = new Map(services.map(s => [s.id, s]));
    const groupMap = new Map(groups.map(g => [g.id, g.name]));

    // Fetch employee & user names for creators (CreatedID maps to User ID on VTTech)
    const creatorIds = [...new Set(appointments.map(a => a.created_by_id).filter(Boolean))] as number[];
    const employeeMap = new Map<number, string>();
    if (creatorIds.length > 0) {
      // 1. Fetch from users table (which has full_name mapped to VTTech EmployeeName)
      const users = await this.prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, full_name: true },
      });
      users.forEach(u => {
        if (u.full_name) employeeMap.set(u.id, u.full_name);
      });

      // 2. Fallback to employees table for any IDs that are not in users mapping
      const missingIds = creatorIds.filter(id => !employeeMap.has(id));
      if (missingIds.length > 0) {
        const employees = await this.prisma.employee.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, name: true },
        });
        employees.forEach(e => {
          if (e.name) employeeMap.set(e.id, e.name);
        });
      }
    }

    const data = appointments.map(a => {
      const customer = a.customer;
      const custCode = customer?.code || '';
      const custName = customer?.name || a.customer_name || '';
      const mlhKh = `${custCode}${custName}`;

      const creatorName = a.created_by_id ? (employeeMap.get(a.created_by_id) || '') : '';
      let saleTimeDate = creatorName;
      const createdDate = a.vttech_created_at || a.appointment_date;
      if (createdDate) {
        const hh = String(createdDate.getHours()).padStart(2, '0');
        const mm = String(createdDate.getMinutes()).padStart(2, '0');
        const dd = String(createdDate.getDate()).padStart(2, '0');
        const mMonth = String(createdDate.getMonth() + 1).padStart(2, '0');
        const yyyy = createdDate.getFullYear();
        saleTimeDate = `${creatorName}${hh}:${mm} ${dd}-${mMonth}-${yyyy}`;
      }

      const sourceName = customer?.source?.name || 'Khách Giới Thiệu';

      // Find funnel name
      const service = a.service_id ? serviceMap.get(a.service_id) : null;
      const funnelName = service?.group_id ? groupMap.get(service.group_id) : '';
      const noteWithFunnel = funnelName ? `[${funnelName}] ${a.note || ''}`.trim() : (a.note || '');

      return {
        id: a.id,
        vttech_code: a.vttech_code || '',
        mlh_kh: mlhKh,
        appointment_date: a.appointment_date,
        phone: a.phone || '',
        note: noteWithFunnel,
        status_name: a.status_name || ((a.status === 2 || a.status === 4) ? 'Ra Về' : a.status === 3 ? 'Đã Hủy' : 'Đặt Hẹn'),
        branch_name: a.branch?.name || a.branch_name || '',
        type_name: a.type_name || (a.service_name?.toLowerCase().includes('tư vấn') ? 'Tư vấn' : 'Điều trị'),
        sale_time_date: saleTimeDate,
        source_name: sourceName,
        // include legacy/original fields
        customer_name: custName,
        service_name: a.service_name || '',
        employee_name: a.employee_name || '',
        status: a.status,
      };
    });

    return {
      data,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }

  @Get('anamnesis/details')
  async getAnamnesisDetails(
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

    const where: any = {
      created_at: { gte: start, lte: end }
    };
    if (branchId && branchId !== '0') {
      where.customer = { branch_id: parseInt(branchId) };
    }

    const [data, total] = await Promise.all([
      this.prisma.customerAnamnesis.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
              branch_id: true,
              branch: { select: { name: true } }
            }
          }
        }
      }),
      this.prisma.customerAnamnesis.count({ where }),
    ]);

    const mappedData = data.map((item) => ({
      id: item.id,
      date: item.created_at,
      customerId: item.customer_id,
      customerName: item.customer?.name || 'N/A',
      customerCode: item.customer?.code || '',
      phone: item.customer?.phone || '',
      content: item.content || '',
      note: item.note || '',
      branchName: item.customer?.branch?.name || `CN #${item.customer?.branch_id || ''}`,
    }));

    return {
      data: mappedData,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }

  @Get('images/details')
  async getImagesDetails(
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

    const where: any = {
      created_at: { gte: start, lte: end }
    };
    if (branchId && branchId !== '0') {
      where.customer = { branch_id: parseInt(branchId) };
    }

    const [data, total] = await Promise.all([
      this.prisma.customerImageFolder.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          images: { select: { id: true } },
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
              branch_id: true,
              branch: { select: { name: true } }
            }
          }
        }
      }),
      this.prisma.customerImageFolder.count({ where }),
    ]);

    const mappedData = data.map((item) => ({
      id: item.id,
      date: item.created_at,
      customerId: item.customer_id,
      customerName: item.customer?.name || 'N/A',
      customerCode: item.customer?.code || '',
      phone: item.customer?.phone || '',
      folderName: item.folder_name || '',
      imagesCount: item.images.length,
      branchName: item.customer?.branch?.name || `CN #${item.customer?.branch_id || ''}`,
    }));

    return {
      data: mappedData,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }

  @Get('care-history/details')
  async getCareHistoryDetails(
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

    const where: any = {
      action_date: { gte: start, lte: end }
    };
    if (branchId && branchId !== '0') {
      where.customer = { branch_id: parseInt(branchId) };
    }

    const [data, total] = await Promise.all([
      this.prisma.customerCareHistory.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { action_date: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
              branch_id: true,
              branch: { select: { name: true } }
            }
          }
        }
      }),
      this.prisma.customerCareHistory.count({ where }),
    ]);

    const mappedData = data.map((item) => ({
      id: item.id,
      date: item.action_date,
      customerId: item.customer_id,
      customerName: item.customer?.name || 'N/A',
      customerCode: item.customer?.code || '',
      phone: item.customer?.phone || '',
      actionType: item.action_type || '',
      note: item.note || '',
      employeeName: item.employee_name || '',
      branchName: item.customer?.branch?.name || `CN #${item.customer?.branch_id || ''}`,
    }));

    return {
      data: mappedData,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }

  @Get('complaints/details')
  async getComplaintsDetails(
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

    const where: any = {
      created_at: { gte: start, lte: end }
    };
    if (branchId && branchId !== '0') {
      where.customer = { branch_id: parseInt(branchId) };
    }

    const [data, total] = await Promise.all([
      this.prisma.customerComplaint.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
              branch_id: true,
              branch: { select: { name: true } }
            }
          }
        }
      }),
      this.prisma.customerComplaint.count({ where }),
    ]);

    const mappedData = data.map((item) => ({
      id: item.id,
      date: item.created_at,
      customerId: item.customer_id,
      customerName: item.customer?.name || 'N/A',
      customerCode: item.customer?.code || '',
      phone: item.customer?.phone || '',
      content: item.content || '',
      statusName: item.status_name || '',
      branchName: item.customer?.branch?.name || `CN #${item.customer?.branch_id || ''}`,
    }));

    return {
      data: mappedData,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }

  @Get('treatment-plans/details')
  async getTreatmentPlansDetails(
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

    const where: any = {
      created_at: { gte: start, lte: end }
    };
    if (branchId && branchId !== '0') {
      where.customer = { branch_id: parseInt(branchId) };
    }

    const [data, total] = await Promise.all([
      this.prisma.customerTreatmentPlan.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
              branch_id: true,
              branch: { select: { name: true } }
            }
          }
        }
      }),
      this.prisma.customerTreatmentPlan.count({ where }),
    ]);

    const mappedData = data.map((item) => ({
      id: item.id,
      date: item.created_at,
      customerId: item.customer_id,
      customerName: item.customer?.name || 'N/A',
      customerCode: item.customer?.code || '',
      phone: item.customer?.phone || '',
      serviceName: item.service_name || '',
      doctorName: item.doctor_name || '',
      note: item.note || '',
      branchName: item.customer?.branch?.name || `CN #${item.customer?.branch_id || ''}`,
    }));

    return {
      data: mappedData,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    };
  }
}
