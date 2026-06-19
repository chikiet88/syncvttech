"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReportController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const common_1 = require("@nestjs/common");
const vttech_api_service_1 = require("./vttech-api.service");
const prisma_service_1 = require("./prisma.service");
let ReportController = ReportController_1 = class ReportController {
    vttechApi;
    prisma;
    logger = new common_1.Logger(ReportController_1.name);
    constructor(vttechApi, prisma) {
        this.vttechApi = vttechApi;
        this.prisma = prisma;
    }
    async getRevenue(branchID, dateFrom, dateTo, search, page = '1', limit = '20', sortBy = 'created_at', sortOrder = 'desc', serviceOnly) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (serviceOnly === 'true') {
            where.service_id = { not: null };
        }
        if (branchID && branchID !== '0') {
            where.branch_id = parseInt(branchID);
        }
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
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
        let [transactions, total] = await Promise.all([
            this.prisma.revenueTransaction.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.revenueTransaction.count({ where }),
        ]);
        if (total === 0 && !search && pageNum === 1) {
            try {
                await this.vttechApi.login();
                const toVTTechDate = (d) => {
                    if (!d)
                        return '';
                    if (d.includes('-') && d.split('-')[0].length === 4) {
                        const [y, m, d_] = d.split('-');
                        return `${d_}-${m}-${y}`;
                    }
                    return d.replace(/\//g, '-');
                };
                const vtDateFrom = toVTTechDate(dateFrom);
                const vtDateTo = toVTTechDate(dateTo);
                this.logger.log(`📡 Live fetching revenue from VTTech: Branch ${branchID}, Range ${vtDateFrom} to ${vtDateTo}`);
                const res = await this.vttechApi.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataDetailByBranch', { branchID: branchID || "0", dateFrom: vtDateFrom, dateTo: vtDateTo });
                const table = res?.Table || [];
                if (table.length > 0) {
                    this.logger.log(`✅ Live fetch success: Found ${table.length} revenue records.`);
                    transactions = table.map((item, idx) => ({
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
            }
            catch (error) {
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
        const customerIds = [...new Set(transactions.map((t) => t.customer_id).filter(Boolean))];
        const customers = await this.prisma.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, phone: true }
        });
        const phoneMap = new Map(customers.map(c => [c.id, c.phone]));
        const detailedData = transactions.map((item) => {
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
    async getBranchSummary(dateFrom, dateTo) {
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
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
        const vttechSummary = await this.vttechApi.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'Loadata', {
            branchID: 0,
            dateFrom: dateFrom,
            dateTo: dateTo
        });
        const summaries = await Promise.all(branches.map(async (branch) => {
            const vtBranch = vttechSummary.Table?.find((t) => t.BranchID === branch.id);
            const [customersCountResult, appointmentsCount, treatmentsCount, servicesCount] = await Promise.all([
                this.prisma.customer.count({
                    where: {
                        branch_id: branch.id,
                        crm_created_at: {
                            gte: start,
                            lte: end,
                        },
                    },
                }),
                this.prisma.appointment.count({
                    where: { branch_id: branch.id, appointment_date: { gte: start, lte: end } }
                }),
                this.prisma.treatment.count({
                    where: { branch_id: branch.id, treatment_date: { gte: start, lte: end } }
                }),
                this.prisma.revenueTransaction.count({
                    where: { branch_id: branch.id, date: { gte: start, lte: end }, service_id: { not: null } }
                }),
            ]);
            const customerCount = customersCountResult || 0;
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
    async getCustomersDetails(branchId, from, to, type, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(dStr);
        };
        const start = parseDate(from || '');
        const end = parseDate(to || '');
        end.setHours(23, 59, 59, 999);
        const where = { crm_created_at: { gte: start, lte: end } };
        if (branchId && branchId !== '0')
            where.branch_id = parseInt(branchId);
        let [data, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { crm_created_at: 'desc' },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    phone: true,
                    crm_created_at: true,
                    branch_id: true,
                    source: { select: { name: true } }
                }
            }),
            this.prisma.customer.count({ where }),
        ]);
        let isLiveFetch = false;
        let liveData = [];
        if (total === 0 && pageNum === 1 && branchId && branchId !== '0') {
            try {
                await this.vttechApi.login();
                const yyyy = start.getFullYear();
                const mm = String(start.getMonth() + 1).padStart(2, '0');
                const dd = String(start.getDate()).padStart(2, '0');
                const formattedDate = `${yyyy}-${mm}-${dd} 00:00:00`;
                const fetchType = type ? parseInt(type) : 1;
                this.logger.log(`📡 Live fetching customers: Branch ${branchId}, Date ${formattedDate}, Type ${fetchType}`);
                let res = await this.vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', { branchID: branchId, dateFrom: formattedDate, dateTo: formattedDate, type: fetchType });
                let table = res?.Table || [];
                if (table.length === 0 && !type) {
                    this.logger.log(`   🔸 No results for Type 1, trying Type 2 (Activity)...`);
                    res = await this.vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', { branchID: branchId, dateFrom: formattedDate, dateTo: formattedDate, type: 2 });
                    table = res?.Table || [];
                }
                if (table.length > 0) {
                    this.logger.log(`✅ Live fetch success: Found ${table.length} customers.`);
                    liveData = table.map((item, idx) => ({
                        id: `live-${idx}`,
                        customerId: parseInt(item.CustID || item.ID),
                        customerName: item.CustName || item.FullName,
                        customerCode: item.CustCode || item.Code,
                        phone: item.Phone || item.Mobile,
                        crm_created_at: item.Created ? new Date(item.Created) : start,
                        branch_id: parseInt(branchId),
                    }));
                    total = liveData.length;
                    isLiveFetch = true;
                }
            }
            catch (e) {
                this.logger.error(`Live Fetch Registrations Error: ${e.message}`);
            }
        }
        const branches = await this.prisma.branch.findMany({ select: { id: true, name: true } });
        const branchMap = new Map(branches.map(b => [b.id, b.name]));
        let mappedData = [];
        if (isLiveFetch) {
            mappedData = liveData.map((item) => ({
                id: item.id,
                date: item.crm_created_at,
                customerId: item.customerId,
                customerName: item.customerName,
                customerCode: item.customerCode,
                phone: item.phone,
                branchId: item.branch_id,
                branchName: branchMap.get(item.branch_id) || `CN #${item.branch_id}`,
                sourceName: 'Khách Giới Thiệu',
                createdAt: item.crm_created_at,
            }));
        }
        else {
            mappedData = data.map((item) => ({
                id: item.id,
                date: item.crm_created_at,
                customerId: item.id,
                customerName: item.name || 'N/A',
                customerCode: item.code || '',
                phone: item.phone || '',
                branchId: item.branch_id,
                branchName: item.branch_id ? (branchMap.get(item.branch_id) || `CN #${item.branch_id}`) : 'Khác',
                sourceName: item.source?.name || 'Khách Giới Thiệu',
                createdAt: item.crm_created_at || null,
            }));
        }
        return {
            data: mappedData,
            pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
        };
    }
    async getTreatmentsDetails(branchId, from, to, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(dStr);
        };
        const start = parseDate(from || '');
        const end = parseDate(to || '');
        end.setHours(23, 59, 59, 999);
        const where = { treatment_date: { gte: start, lte: end } };
        if (branchId && branchId !== '0')
            where.branch_id = parseInt(branchId);
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
    async getAppointmentsDetails(branchId, from, to, page = '1', limit = '20', q) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(dStr);
        };
        const start = parseDate(from || '');
        const end = parseDate(to || '');
        end.setHours(23, 59, 59, 999);
        const where = {};
        const whereAndConditions = [];
        if (!q) {
            whereAndConditions.push({ appointment_date: { gte: start, lte: end } });
        }
        if (branchId === 'taza') {
            whereAndConditions.push({
                branch: {
                    name: { contains: 'Taza', mode: 'insensitive' },
                },
            });
        }
        else if (branchId === 'timona') {
            whereAndConditions.push({
                branch: {
                    name: { contains: 'Timona', mode: 'insensitive' },
                },
            });
        }
        else if (branchId && branchId !== '0') {
            whereAndConditions.push({ branch_id: parseInt(branchId) });
        }
        else {
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
        const creatorIds = [...new Set(appointments.map(a => a.created_by_id).filter(Boolean))];
        const employeeMap = new Map();
        if (creatorIds.length > 0) {
            const users = await this.prisma.user.findMany({
                where: { id: { in: creatorIds } },
                select: { id: true, full_name: true },
            });
            users.forEach(u => {
                if (u.full_name)
                    employeeMap.set(u.id, u.full_name);
            });
            const missingIds = creatorIds.filter(id => !employeeMap.has(id));
            if (missingIds.length > 0) {
                const employees = await this.prisma.employee.findMany({
                    where: { id: { in: missingIds } },
                    select: { id: true, name: true },
                });
                employees.forEach(e => {
                    if (e.name)
                        employeeMap.set(e.id, e.name);
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
            let funnelName = '';
            const serviceNameLower = a.service_name?.toLowerCase().trim();
            const matchedGroup = groups.find(g => g.name.toLowerCase().trim() === serviceNameLower);
            if (matchedGroup) {
                funnelName = matchedGroup.name;
            }
            else {
                const service = a.service_id ? serviceMap.get(a.service_id) : null;
                if (service && service.name.toLowerCase().trim() === serviceNameLower) {
                    funnelName = service.group_id ? groupMap.get(service.group_id) || '' : '';
                }
                else {
                    const groupById = a.service_id ? groupMap.get(a.service_id) : null;
                    if (groupById) {
                        funnelName = groupById;
                    }
                    else if (service) {
                        funnelName = service.group_id ? groupMap.get(service.group_id) || '' : '';
                    }
                }
            }
            const noteWithFunnel = funnelName ? `${funnelName}\n${a.note || ''}`.trim() : (a.note || '');
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
    async getAnamnesisDetails(branchId, from, to, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(dStr);
        };
        const start = parseDate(from || '');
        const end = parseDate(to || '');
        end.setHours(23, 59, 59, 999);
        const where = {
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
    async getImagesDetails(branchId, from, to, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(dStr);
        };
        const start = parseDate(from || '');
        const end = parseDate(to || '');
        end.setHours(23, 59, 59, 999);
        const where = {
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
    async getCareHistoryDetails(branchId, from, to, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(dStr);
        };
        const start = parseDate(from || '');
        const end = parseDate(to || '');
        end.setHours(23, 59, 59, 999);
        const where = {
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
    async getComplaintsDetails(branchId, from, to, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(dStr);
        };
        const start = parseDate(from || '');
        const end = parseDate(to || '');
        end.setHours(23, 59, 59, 999);
        const where = {
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
    async getTreatmentPlansDetails(branchId, from, to, page = '1', limit = '20') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const parseDate = (dStr) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            if (parts.length === 3) {
                if (parts[0].length === 4)
                    return new Date(dStr);
                const [d, m, y] = parts;
                return new Date(`${y}-${m}-${d}`);
            }
            return new Date(dStr);
        };
        const start = parseDate(from || '');
        const end = parseDate(to || '');
        end.setHours(23, 59, 59, 999);
        const where = {
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
};
exports.ReportController = ReportController;
__decorate([
    (0, common_1.Get)('revenue'),
    __param(0, (0, common_1.Query)('branchID')),
    __param(1, (0, common_1.Query)('dateFrom')),
    __param(2, (0, common_1.Query)('dateTo')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('sortBy')),
    __param(7, (0, common_1.Query)('sortOrder')),
    __param(8, (0, common_1.Query)('service_only')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getRevenue", null);
__decorate([
    (0, common_1.Get)('branches'),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getBranchSummary", null);
__decorate([
    (0, common_1.Get)('customers/details'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getCustomersDetails", null);
__decorate([
    (0, common_1.Get)('treatments/details'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getTreatmentsDetails", null);
__decorate([
    (0, common_1.Get)('appointments/details'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getAppointmentsDetails", null);
__decorate([
    (0, common_1.Get)('anamnesis/details'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getAnamnesisDetails", null);
__decorate([
    (0, common_1.Get)('images/details'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getImagesDetails", null);
__decorate([
    (0, common_1.Get)('care-history/details'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getCareHistoryDetails", null);
__decorate([
    (0, common_1.Get)('complaints/details'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getComplaintsDetails", null);
__decorate([
    (0, common_1.Get)('treatment-plans/details'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getTreatmentPlansDetails", null);
exports.ReportController = ReportController = ReportController_1 = __decorate([
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [vttech_api_service_1.VttechApiService,
        prisma_service_1.PrismaService])
], ReportController);
//# sourceMappingURL=report.controller.js.map