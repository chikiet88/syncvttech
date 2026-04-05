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
var SyncProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const sync_service_1 = require("./sync.service");
let SyncProcessor = SyncProcessor_1 = class SyncProcessor extends bullmq_1.WorkerHost {
    syncService;
    logger = new common_1.Logger(SyncProcessor_1.name);
    constructor(syncService) {
        super();
        this.syncService = syncService;
    }
    async process(job) {
        const { type, data } = job.data;
        this.logger.log(`Processing job ${job.id} of type ${type}`);
        try {
            switch (type) {
                case 'sync-customer-detail':
                    return await this.syncService.processQueuedCustomerDetail(data.customerId, data.parentTaskId);
                case 'sync-revenue-day':
                    return await this.syncService.processQueuedRevenueDay(data.date, data.branchId);
                case 'sync-task':
                    return await this.syncService.processQueuedSyncTask(data.taskId);
                default:
                    this.logger.warn(`Unknown job type: ${type}`);
                    return;
            }
        }
        catch (error) {
            this.logger.error(`Failed to process job ${job.id}: ${error.message}`);
            throw error;
        }
    }
};
exports.SyncProcessor = SyncProcessor;
exports.SyncProcessor = SyncProcessor = SyncProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('sync-queue'),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncProcessor);
//# sourceMappingURL=sync.processor.js.map