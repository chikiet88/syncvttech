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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const sync_service_1 = require("./sync.service");
const pbx_sync_service_1 = require("./pbx-sync.service");
const prisma_service_1 = require("./prisma.service");
const vttech_api_service_1 = require("./vttech-api.service");
const excel_export_service_1 = require("./excel-export.service");
const gsheet_report_service_1 = require("./gsheet-report.service");
let AppController = class AppController {
    appService;
    syncService;
    pbxSync;
    prisma;
    vttechApi;
    excelExportService;
    gsheetReportService;
    constructor(appService, syncService, pbxSync, prisma, vttechApi, excelExportService, gsheetReportService) {
        this.appService = appService;
        this.syncService = syncService;
        this.pbxSync = pbxSync;
        this.prisma = prisma;
        this.vttechApi = vttechApi;
        this.excelExportService = excelExportService;
        this.gsheetReportService = gsheetReportService;
    }
    async checkLogin(user, pass) {
        return this.vttechApi.checkLoginStatus();
    }
    getHello() {
        return this.appService.getHello();
    }
    async triggerSync(from, to, date, forceMaster, syncPbx, syncDetails) {
        const dateFrom = from || date || new Date().toISOString().split('T')[0];
        const dateTo = to || date || dateFrom;
        const isForceMaster = forceMaster === 'true' || forceMaster === '1';
        const isSyncPbx = syncPbx === 'true' || syncPbx === '1';
        const isSyncDetails = syncDetails === 'true' || syncDetails === '1' || syncDetails === undefined;
        this.syncService.syncByRange(dateFrom, dateTo, isForceMaster, isSyncPbx, isSyncDetails).catch(err => {
            console.error('Background sync failed:', err);
        });
        return {
            message: `Đã bắt đầu quá trình đồng bộ từ: ${dateFrom} đến ${dateTo}`,
            status: 'processing'
        };
    }
    async triggerRevenueSync(from, to, date) {
        const dateFrom = from || date || new Date().toISOString().split('T')[0];
        const dateTo = to || date || dateFrom;
        this.syncService.syncRevenue(dateFrom, dateTo).catch(err => {
            console.error('Background revenue sync failed:', err);
        });
        return {
            message: `Đã bắt đầu đồng bộ doanh thu từ: ${dateFrom} đến ${dateTo}`,
            status: 'processing'
        };
    }
    async stopSync() {
        this.syncService.stopSync();
        return { message: 'Đang gửi yêu cầu dừng đồng bộ...' };
    }
    async resetQueue() {
        return this.syncService.resetQueue();
    }
    async triggerPbxSync(from, to, date) {
        const dateFrom = from || date || new Date().toISOString().split('T')[0];
        const dateTo = to || date || dateFrom;
        this.pbxSync.syncCdr(dateFrom, dateTo).catch(err => {
            console.error('PBX sync failed:', err);
        });
        return {
            message: `Đã bắt đầu đồng bộ PBX CDR từ: ${dateFrom} đến ${dateTo}`,
            status: 'processing'
        };
    }
    async triggerPbxMasterSync() {
        this.pbxSync.syncExtensions().catch(err => console.error(err));
        this.pbxSync.syncPbxEmployees().catch(err => console.error(err));
        return { message: 'Đã bắt đầu đồng bộ Extensions và Employees' };
    }
    async getCrawlLogs(limit) {
        const take = limit ? parseInt(limit) : 100;
        const logs = await this.syncService.getLogs(take);
        return logs;
    }
    async getPbxLogs(limit) {
        const take = limit ? parseInt(limit) : 100;
        return this.prisma.pbxSyncLog.findMany({
            take: take,
            orderBy: { created_at: 'desc' },
        });
    }
    async getGsheetReports(limit) {
        const take = limit ? parseInt(limit) : 50;
        return this.gsheetReportService.getReports(take);
    }
    async getGsheetReportDetail(id) {
        const reportId = parseInt(id);
        const report = await this.gsheetReportService.getReportById(reportId);
        if (!report) {
            throw new common_1.HttpException('Không tìm thấy báo cáo', common_1.HttpStatus.NOT_FOUND);
        }
        return report;
    }
    async triggerGsheetSync() {
        this.gsheetReportService.compareAndPushData().catch(err => {
            console.error('Gsheet manual sync and report failed:', err);
        });
        return {
            message: 'Đã kích hoạt thủ công tiến trình đối soát và đồng bộ Google Sheets trong nền.',
            status: 'processing'
        };
    }
    async getSyncStatus() {
        return this.syncService.getSyncStatus();
    }
    async seedTasks(from, to) {
        if (!from || !to)
            throw new Error('Cần cung cấp from và to (YYYY-MM-DD)');
        const result = await this.syncService.seedSyncTasks(from, to);
        return {
            message: `Đã khởi tạo xong ${result.created} task mới.`,
            ...result
        };
    }
    async startTasks(limit) {
        const take = limit ? parseInt(limit) : 1000;
        const result = await this.syncService.pushPendingTasksToQueue(take);
        return {
            message: `Đã đẩy ${result.pushed} task vào hàng đợi xử lý.`,
            ...result
        };
    }
    async getTasksSummary() {
        const total = await this.prisma.syncTask.count();
        const success = await this.prisma.syncTask.count({ where: { status: 'SUCCESS' } });
        const progress = total > 0 ? (success / total) * 100 : 0;
        const details = await this.prisma.syncTask.groupBy({
            by: ['status'],
            _count: { _all: true }
        });
        const aggregates = await this.prisma.syncTask.aggregate({
            _sum: {
                customers_count: true,
                appointments_count: true,
                services_count: true,
                treatments_count: true,
                sales_total: true,
                revenue_total: true,
                total_details: true,
                completed_details: true,
            }
        });
        const sum = aggregates._sum;
        return {
            total,
            success,
            progress,
            details,
            detailProgress: {
                total: sum.total_details || 0,
                completed: sum.completed_details || 0,
                percentage: (sum.total_details || 0) > 0
                    ? ((sum.completed_details || 0) / (sum.total_details || 0)) * 100
                    : 0
            },
            stats: {
                customers: sum.customers_count || 0,
                appointments: sum.appointments_count || 0,
                services: sum.services_count || 0,
                treatments: sum.treatments_count || 0,
                sales: sum.sales_total || 0,
                revenue: sum.revenue_total || 0,
            }
        };
    }
    async getBranches() {
        return this.prisma.branch.findMany({
            where: { is_active: 1 },
            orderBy: { name: 'asc' },
        });
    }
    async getCronConfigs() {
        const defaultConfigs = [
            {
                id: 'handleDailySync',
                name: 'Đồng bộ doanh thu & khách hàng hàng ngày',
                enabled: true,
                description: 'Đồng bộ toàn bộ dữ liệu (doanh thu -> khách hàng -> chi tiết) của ngày hôm qua lúc 00:00.',
            },
            {
                id: 'handleDailyPbxSync',
                name: 'Đồng bộ dữ liệu tổng đài hàng ngày',
                enabled: true,
                description: 'Đồng bộ Extensions, Call Center Employees và Nhật ký cuộc gọi CDR kèm File ghi âm lúc 01:00.',
            },
            {
                id: 'handleHeartbeat',
                name: 'Duy trì Session VTTech (Heartbeat)',
                enabled: true,
                description: 'Duy trì nhịp đập session login cho các tài khoản VTTech để tránh bị logout (mỗi 5 phút).',
            },
            {
                id: 'handleFrequentSync',
                name: 'Đồng bộ nhanh định kỳ',
                enabled: true,
                description: 'Đồng bộ nhanh dữ liệu ngày hiện tại để phục vụ Dashboard (mỗi 20 phút).',
            },
            {
                id: 'handleFutureAppointmentsSync',
                name: 'Đồng bộ lịch hẹn trước (Future Appointments)',
                enabled: true,
                description: 'Tự động quét và đồng bộ lịch hẹn của 7 ngày tiếp theo để đảm bảo thông tin lịch hẹn trước luôn đầy đủ (mỗi 30 phút).',
            },
            {
                id: 'handleHistoricalSyncCron',
                name: 'Đồng bộ dữ liệu lịch sử (Backlog)',
                enabled: true,
                description: 'Tự động quét và cày các tác vụ lịch sử còn tồn đọng từ năm 2019 lên (mỗi 30 phút).',
            },
            {
                id: 'handleStaleTasksCron',
                name: 'Tự chữa lành hệ thống (Self-healing)',
                enabled: true,
                description: 'Tự động phát hiện và giải phóng các task đồng bộ bị kẹt trong DB & BullMQ (mỗi 10 phút).',
            },
            {
                id: 'handleQueueCleanupCron',
                name: 'Dọn dẹp hàng đợi BullMQ',
                enabled: true,
                description: 'Dọn dẹp các job cũ đã hoàn tất hoặc thất bại trong BullMQ để tối ưu RAM Redis (mỗi 1 giờ).',
            },
            {
                id: 'handleDailyReporting',
                name: 'Báo cáo tự động hàng ngày',
                enabled: true,
                description: 'Tổng hợp và tạo báo cáo giám sát đồng bộ gửi về dashboard lúc 08:00 và 20:00.',
            },
            {
                id: 'handleGoogleSheetPushCron',
                name: 'Tự động đẩy báo cáo lịch hẹn lên Google Sheets',
                enabled: true,
                description: 'Tự động tổng hợp và đẩy báo cáo lịch hẹn tháng hiện tại lên Google Sheets lúc 22:00 và 23:30 hàng ngày (Giờ Việt Nam).',
            },
            {
                id: 'handleGsheetReportCron',
                name: 'Tự động đối soát & đẩy khách hàng lên Google Sheets',
                enabled: true,
                description: 'Tự động chạy đối soát chênh lệch khách hàng DB vs GSheet, tạo báo cáo lưu DB và cập nhật dữ liệu mới từ 01/01/2024 lên Google Sheets lúc 7h sáng hàng ngày.',
            },
            {
                id: 'syncTabGeneralInfo',
                name: 'Đồng bộ Tab Thông Tin',
                enabled: true,
                description: 'Đồng bộ thông tin cá nhân cơ bản và trạng thái khách hàng.',
            },
            {
                id: 'syncTabAnamnesis',
                name: 'Đồng bộ Tab Tiền Sử',
                enabled: true,
                description: 'Đồng bộ tiền sử bệnh lý của khách hàng.',
            },
            {
                id: 'syncTabCareHistory',
                name: 'Đồng bộ Tab Tư Vấn & Lịch Sử',
                enabled: true,
                description: 'Đồng bộ lịch sử tương tác, tư vấn chăm sóc khách hàng.',
            },
            {
                id: 'syncTabTreatmentPlans',
                name: 'Đồng bộ Tab Chẩn Đoán',
                enabled: true,
                description: 'Đồng bộ phác đồ điều trị của khách hàng.',
            },
            {
                id: 'syncTabServiceTab',
                name: 'Đồng bộ Tab Dịch Vụ',
                enabled: true,
                description: 'Đồng bộ danh sách dịch vụ khách hàng đã mua.',
            },
            {
                id: 'syncTabTreatments',
                name: 'Đồng bộ Tab Điều Trị',
                enabled: true,
                description: 'Đồng bộ nhật ký các buổi điều trị thực tế.',
            },
            {
                id: 'syncTabPayments',
                name: 'Đồng bộ Tab Thanh Toán',
                enabled: true,
                description: 'Đồng bộ các hóa đơn thanh toán, công nợ và thẻ dịch vụ.',
            },
            {
                id: 'syncTabImages',
                name: 'Đồng bộ Tab Hình Ảnh',
                enabled: true,
                description: 'Đồng bộ hình ảnh điều trị của khách hàng.',
            },
            {
                id: 'syncTabSchedules',
                name: 'Đồng bộ Tab Lịch Hẹn',
                enabled: true,
                description: 'Đồng bộ lịch hẹn chi tiết của khách hàng.',
            },
            {
                id: 'syncTabComplaints',
                name: 'Đồng bộ Tab Complaint',
                enabled: true,
                description: 'Đồng bộ lịch sử khiếu nại của khách hàng.',
            },
            {
                id: 'syncTabTickets',
                name: 'Đồng bộ Tickets khách hàng',
                enabled: true,
                description: 'Đồng bộ danh sách tickets hỗ trợ của khách hàng.',
            },
            {
                id: 'syncTabSms',
                name: 'Đồng bộ SMS khách hàng',
                enabled: true,
                description: 'Đồng bộ lịch sử tin nhắn SMS đã gửi cho khách hàng.',
            },
            {
                id: 'syncTabVttechCalls',
                name: 'Đồng bộ Cuộc Gọi VTTech khách hàng',
                enabled: true,
                description: 'Đồng bộ lịch sử cuộc gọi thoại VTTech của khách hàng.',
            },
        ];
        for (const conf of defaultConfigs) {
            await this.prisma.cronConfig.upsert({
                where: { id: conf.id },
                update: {
                    name: conf.name,
                    description: conf.description,
                },
                create: conf,
            });
        }
        const configs = await this.prisma.cronConfig.findMany({
            orderBy: { id: 'asc' },
        });
        const result = await Promise.all(configs.map(async (config) => {
            let recentTasks = [];
            if (config.id === 'handleDailyPbxSync') {
                const pbxLogs = await this.prisma.pbxSyncLog.findMany({
                    where: {
                        sync_type: 'cdr',
                        status: { in: ['success', 'partial'] },
                    },
                    orderBy: { created_at: 'desc' },
                    take: 2,
                });
                recentTasks = pbxLogs.map(log => ({
                    id: log.id,
                    completed_at: log.end_time || log.created_at,
                    status: log.status,
                    message: `Đồng bộ cuộc gọi: Thành công ${log.success_count}, Thất bại ${log.failed_count}`,
                }));
            }
            else if (config.id === 'handleDailySync') {
                const crawlLogs = await this.prisma.crawlLog.findMany({
                    where: {
                        crawl_type: { in: ['revenue_sync', 'handleDailySync'] },
                        status: 'success',
                    },
                    orderBy: { created_at: 'desc' },
                    take: 2,
                });
                recentTasks = crawlLogs.map(log => ({
                    id: log.id,
                    completed_at: log.created_at,
                    status: log.status,
                    message: log.message || `Đồng bộ doanh thu thành công (${log.records_count} bản ghi)`,
                }));
            }
            else if (config.id === 'handleDailyReporting') {
                const crawlLogs = await this.prisma.crawlLog.findMany({
                    where: {
                        crawl_type: 'DAILY_REPORT',
                        status: 'success',
                    },
                    orderBy: { created_at: 'desc' },
                    take: 2,
                });
                recentTasks = crawlLogs.map(log => ({
                    id: log.id,
                    completed_at: log.created_at,
                    status: log.status,
                    message: log.message || 'Tạo báo cáo tự động thành công',
                }));
            }
            else if (config.id === 'handleHistoricalSyncCron') {
                const crawlLogs = await this.prisma.crawlLog.findMany({
                    where: {
                        crawl_type: { startsWith: 'SYNC_TASK_' },
                        status: 'success',
                    },
                    orderBy: { created_at: 'desc' },
                    take: 2,
                });
                recentTasks = crawlLogs.map(log => ({
                    id: log.id,
                    completed_at: log.created_at,
                    status: log.status,
                    message: log.message || `Đồng bộ nhánh thành công (KH: ${log.customers_count}, LH: ${log.appointments_count})`,
                }));
            }
            else if (config.id === 'handleGoogleSheetPushCron') {
                const crawlLogs = await this.prisma.crawlLog.findMany({
                    where: {
                        crawl_type: { in: ['handleGoogleSheetPushCron', 'handleGoogleSheetPushCron_Old', 'handleGoogleSheetPushCron_New'] },
                        status: 'success',
                    },
                    orderBy: { created_at: 'desc' },
                    take: 2,
                });
                recentTasks = crawlLogs.map(log => ({
                    id: log.id,
                    completed_at: log.created_at,
                    status: log.status,
                    message: log.message || 'Chạy thành công',
                }));
            }
            else if (config.id === 'handleGsheetReportCron') {
                const crawlLogs = await this.prisma.crawlLog.findMany({
                    where: {
                        crawl_type: 'handleGsheetReportCron',
                        status: 'success',
                    },
                    orderBy: { created_at: 'desc' },
                    take: 2,
                });
                recentTasks = crawlLogs.map(log => ({
                    id: log.id,
                    completed_at: log.created_at,
                    status: log.status,
                    message: log.message || 'Đồng bộ & đối soát thành công',
                }));
            }
            else {
                const crawlLogs = await this.prisma.crawlLog.findMany({
                    where: {
                        crawl_type: config.id,
                        status: 'success',
                    },
                    orderBy: { created_at: 'desc' },
                    take: 2,
                });
                recentTasks = crawlLogs.map(log => ({
                    id: log.id,
                    completed_at: log.created_at,
                    status: log.status,
                    message: log.message || 'Chạy thành công',
                }));
            }
            const lastSuccessAt = recentTasks.length > 0 ? recentTasks[0].completed_at : null;
            return {
                ...config,
                last_success_at: lastSuccessAt,
                recent_tasks: recentTasks,
            };
        }));
        return result;
    }
    async updateCronConfig(id, body) {
        return this.prisma.cronConfig.update({
            where: { id },
            data: { enabled: body.enabled },
        });
    }
    async exportAppointments(from, to, branchId, res) {
        try {
            if (!from || !to) {
                return res.status(400).json({ error: 'Both from and to dates are required (format: YYYY-MM-DD)' });
            }
            const buffer = await this.excelExportService.exportAppointmentsToExcel(from, to, branchId);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=DSKH_TAZA_2026_LICH_HEN.xlsx`);
            return res.send(buffer);
        }
        catch (error) {
            console.error('Failed to export appointments:', error);
            return res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }
    async pushGoogleSheet(from, to, res) {
        try {
            if (!from || !to) {
                return res.status(400).json({ error: 'Both from and to dates are required (format: YYYY-MM-DD)' });
            }
            const result = await this.excelExportService.pushToGoogleSheet(from, to);
            return res.json(result);
        }
        catch (error) {
            console.error('Failed to push appointments to Google Sheets:', error);
            return res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }
    async syncTabManual(body) {
        const { tabId, fromDate, toDate } = body;
        if (!tabId || !fromDate || !toDate) {
            throw new common_1.HttpException('Vui lòng cung cấp đầy đủ: tabId, fromDate, toDate', common_1.HttpStatus.BAD_REQUEST);
        }
        const result = await this.syncService.triggerManualTabSync(tabId, fromDate, toDate);
        return {
            success: true,
            message: `Đã nạp thành công ${result.pushed} khách hàng vào hàng đợi để đồng bộ tab này.`,
            ...result,
        };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('check-login'),
    __param(0, (0, common_1.Query)('user')),
    __param(1, (0, common_1.Query)('pass')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "checkLogin", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('sync'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('date')),
    __param(3, (0, common_1.Query)('forceMaster')),
    __param(4, (0, common_1.Query)('syncPbx')),
    __param(5, (0, common_1.Query)('syncDetails')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "triggerSync", null);
__decorate([
    (0, common_1.Get)('sync/revenue'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "triggerRevenueSync", null);
__decorate([
    (0, common_1.Get)('sync/stop'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "stopSync", null);
__decorate([
    (0, common_1.Get)('sync/reset-queue'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "resetQueue", null);
__decorate([
    (0, common_1.Get)('sync/pbx'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "triggerPbxSync", null);
__decorate([
    (0, common_1.Get)('sync/pbx-master'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "triggerPbxMasterSync", null);
__decorate([
    (0, common_1.Get)('monitoring/logs'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getCrawlLogs", null);
__decorate([
    (0, common_1.Get)('monitoring/pbx-logs'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPbxLogs", null);
__decorate([
    (0, common_1.Get)('monitoring/gsheet-reports'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getGsheetReports", null);
__decorate([
    (0, common_1.Get)('monitoring/gsheet-reports/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getGsheetReportDetail", null);
__decorate([
    (0, common_1.Post)('monitoring/gsheet-reports/sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "triggerGsheetSync", null);
__decorate([
    (0, common_1.Get)('sync/status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSyncStatus", null);
__decorate([
    (0, common_1.Get)('sync/seed-tasks'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "seedTasks", null);
__decorate([
    (0, common_1.Get)('sync/start-tasks'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "startTasks", null);
__decorate([
    (0, common_1.Get)('sync/tasks-summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getTasksSummary", null);
__decorate([
    (0, common_1.Get)('branches'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getBranches", null);
__decorate([
    (0, common_1.Get)('cron-configs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getCronConfigs", null);
__decorate([
    (0, common_1.Patch)('cron-configs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateCronConfig", null);
__decorate([
    (0, common_1.Get)('reports/appointments/export'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('branchId')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "exportAppointments", null);
__decorate([
    (0, common_1.Post)('reports/appointments/push-google-sheet'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "pushGoogleSheet", null);
__decorate([
    (0, common_1.Post)('sync/tab-manual'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "syncTabManual", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        sync_service_1.SyncService,
        pbx_sync_service_1.PbxSyncService,
        prisma_service_1.PrismaService,
        vttech_api_service_1.VttechApiService,
        excel_export_service_1.ExcelExportService,
        gsheet_report_service_1.GsheetReportService])
], AppController);
//# sourceMappingURL=app.controller.js.map