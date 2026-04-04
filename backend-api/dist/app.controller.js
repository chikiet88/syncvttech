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
let AppController = class AppController {
    appService;
    syncService;
    pbxSync;
    prisma;
    vttechApi;
    constructor(appService, syncService, pbxSync, prisma, vttechApi) {
        this.appService = appService;
        this.syncService = syncService;
        this.pbxSync = pbxSync;
        this.prisma = prisma;
        this.vttechApi = vttechApi;
    }
    async checkLogin(user, pass) {
        return this.vttechApi.checkLoginStatus(user, pass);
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
    async getSyncStatus() {
        return this.syncService.getSyncStatus();
    }
    async getBranches() {
        return this.prisma.branch.findMany({
            where: { is_active: 1 },
            orderBy: { name: 'asc' },
        });
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
    (0, common_1.Get)('sync/status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSyncStatus", null);
__decorate([
    (0, common_1.Get)('branches'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getBranches", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        sync_service_1.SyncService,
        pbx_sync_service_1.PbxSyncService,
        prisma_service_1.PrismaService,
        vttech_api_service_1.VttechApiService])
], AppController);
//# sourceMappingURL=app.controller.js.map