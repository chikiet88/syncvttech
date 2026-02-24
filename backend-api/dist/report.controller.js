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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const common_1 = require("@nestjs/common");
const vttech_api_service_1 = require("./vttech-api.service");
const prisma_service_1 = require("./prisma.service");
let ReportController = class ReportController {
    vttechApi;
    prisma;
    constructor(vttechApi, prisma) {
        this.vttechApi = vttechApi;
        this.prisma = prisma;
    }
    async getRevenue(branchID, dateFrom, dateTo, search, page = '1', limit = '20', sortBy = 'created_at', sortOrder = 'desc') {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (branchID && branchID !== '0') {
            where.branch_id = parseInt(branchID);
        }
        if (dateFrom && dateTo) {
            const parseDate = (dStr) => {
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
            await this.vttechApi.login();
            await this.vttechApi.getXsrfToken();
            const res = await this.vttechApi.callHandler('/Report/Revenue/Branch/AllBranchGrid/', 'LoadataDetailByBranch', { branchID: branchID || "0", dateFrom, dateTo });
            const table = res?.Table || [];
            if (table.length > 0) {
                transactions = table.map((item, idx) => ({
                    id: idx,
                    customer_name: item.CustName,
                    customer_code: item.CustCode,
                    phone: null,
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
        const [services, branches, serviceGroups] = await Promise.all([
            this.prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
            this.prisma.branch.findMany({ select: { id: true, name: true } }),
            this.prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
        ]);
        const serviceMap = new Map(services.map(s => [s.id, s]));
        const branchMap = new Map(branches.map(b => [b.id, b.name]));
        const groupMap = new Map(serviceGroups.map(g => [g.id, g.name]));
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getRevenue", null);
exports.ReportController = ReportController = __decorate([
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [vttech_api_service_1.VttechApiService,
        prisma_service_1.PrismaService])
], ReportController);
//# sourceMappingURL=report.controller.js.map