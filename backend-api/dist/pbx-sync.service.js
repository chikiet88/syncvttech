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
var PbxSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PbxSyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("./prisma.service");
const pbx_api_service_1 = require("./pbx-api.service");
const vttech_api_service_1 = require("./vttech-api.service");
let PbxSyncService = PbxSyncService_1 = class PbxSyncService {
    prisma;
    pbxApi;
    vttechApi;
    logger = new common_1.Logger(PbxSyncService_1.name);
    constructor(prisma, pbxApi, vttechApi) {
        this.prisma = prisma;
        this.pbxApi = pbxApi;
        this.vttechApi = vttechApi;
    }
    async handleDailyPbxSync() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        await this.syncExtensions();
        await this.syncPbxEmployees();
        await this.syncCdr(dateStr, dateStr);
    }
    async syncCdr(dateFrom, dateTo) {
        this.logger.log(`🔄 Syncing CDR from ${dateFrom} to ${dateTo}...`);
        const syncLog = await this.prisma.pbxSyncLog.create({
            data: {
                sync_type: 'cdr',
                status: 'running',
                date_from: new Date(dateFrom),
                date_to: new Date(dateTo),
            },
        });
        try {
            const records = await this.pbxApi.fetchAllCdrRecords(dateFrom, dateTo);
            this.logger.log(`📥 Fetched ${records.length} records from PBX`);
            let successCount = 0;
            let failedCount = 0;
            for (const record of records) {
                try {
                    await this.prisma.pbxCallRecord.upsert({
                        where: { uuid: record.uuid },
                        create: {
                            uuid: record.uuid,
                            direction: record.direction,
                            caller_id_number: record.caller_id_number,
                            outbound_caller_id_number: record.outbound_caller_id_number,
                            destination_number: record.destination_number,
                            start_epoch: record.start_epoch,
                            end_epoch: record.end_epoch,
                            answer_epoch: record.answer_epoch,
                            duration: parseInt(record.duration || '0'),
                            billsec: parseInt(record.billsec || '0'),
                            sip_hangup_disposition: record.sip_hangup_disposition,
                            call_status: record.call_status,
                            record_path: record.record_path,
                            start_time: record.start_epoch ? new Date(record.start_epoch * 1000) : null,
                            answer_time: record.answer_epoch ? new Date(record.answer_epoch * 1000) : null,
                            end_time: record.end_epoch ? new Date(record.end_epoch * 1000) : null,
                            raw_data: record,
                        },
                        update: {
                            direction: record.direction,
                            caller_id_number: record.caller_id_number,
                            outbound_caller_id_number: record.outbound_caller_id_number,
                            destination_number: record.destination_number,
                            start_epoch: record.start_epoch,
                            end_epoch: record.end_epoch,
                            answer_epoch: record.answer_epoch,
                            duration: parseInt(record.duration || '0'),
                            billsec: parseInt(record.billsec || '0'),
                            sip_hangup_disposition: record.sip_hangup_disposition,
                            call_status: record.call_status,
                            record_path: record.record_path,
                            start_time: record.start_epoch ? new Date(record.start_epoch * 1000) : null,
                            answer_time: record.answer_epoch ? new Date(record.answer_epoch * 1000) : null,
                            end_time: record.end_epoch ? new Date(record.end_epoch * 1000) : null,
                            raw_data: record,
                        },
                    });
                    successCount++;
                }
                catch (error) {
                    this.logger.error(`Error upserting record ${record.uuid}: ${error.message}`);
                    failedCount++;
                }
            }
            await this.prisma.pbxSyncLog.update({
                where: { id: syncLog.id },
                data: {
                    status: failedCount === 0 ? 'success' : 'partial',
                    end_time: new Date(),
                    total_records: records.length,
                    success_count: successCount,
                    failed_count: failedCount,
                },
            });
            return { total: records.length, success: successCount, failed: failedCount };
        }
        catch (error) {
            this.logger.error(`Error in syncCdr: ${error.message}`);
            await this.prisma.pbxSyncLog.update({
                where: { id: syncLog.id },
                data: {
                    status: 'failed',
                    end_time: new Date(),
                    error_message: error.message,
                },
            });
            throw error;
        }
    }
    async syncExtensions() {
        this.logger.log('🔄 Syncing Extensions from VTTech...');
        try {
            const result = await this.vttechApi.fetchExtensions();
            const records = result || [];
            let count = 0;
            for (const record of records) {
                await this.prisma.pbxExtension.upsert({
                    where: { vttech_id: record.ID },
                    create: {
                        vttech_id: record.ID,
                        extension: record.Extension,
                        password: record.Password,
                        is_active: 1,
                        raw_data: record,
                    },
                    update: {
                        extension: record.Extension,
                        password: record.Password,
                        raw_data: record,
                    },
                });
                count++;
            }
            this.logger.log(`✅ Synced ${count} extensions`);
            return count;
        }
        catch (error) {
            this.logger.error(`Error syncing extensions: ${error.message}`);
            throw error;
        }
    }
    async syncPbxEmployees() {
        this.logger.log('🔄 Syncing Call Center Employees from VTTech...');
        try {
            const groups = await this.vttechApi.fetchTicketGroups();
            const records = groups || [];
            let count = 0;
            for (const group of records) {
                const members = group.Members || [];
                for (const member of members) {
                    await this.prisma.pbxEmployee.upsert({
                        where: { vttech_id: member.EmployeeId || member.Id },
                        create: {
                            vttech_id: member.EmployeeId || member.Id,
                            name: member.EmployeeName || member.Name,
                            code: member.EmployeeCode || member.Code,
                            phone: member.Mobile || member.Phone,
                            extension: member.Extension || member.Ext,
                            group_id: group.Id,
                            group_name: group.Name,
                            department: member.Department,
                            position: member.Position,
                            is_active: 1,
                            raw_data: member,
                        },
                        update: {
                            name: member.EmployeeName || member.Name,
                            code: member.EmployeeCode || member.Code,
                            phone: member.Mobile || member.Phone,
                            extension: member.Extension || member.Ext,
                            group_id: group.Id,
                            group_name: group.Name,
                            department: member.Department,
                            position: member.Position,
                            raw_data: member,
                        },
                    });
                    count++;
                }
            }
            this.logger.log(`✅ Synced ${count} Call Center employees`);
            return count;
        }
        catch (error) {
            this.logger.error(`Error syncing PBX employees: ${error.message}`);
            throw error;
        }
    }
};
exports.PbxSyncService = PbxSyncService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_1AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PbxSyncService.prototype, "handleDailyPbxSync", null);
exports.PbxSyncService = PbxSyncService = PbxSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pbx_api_service_1.PbxApiService,
        vttech_api_service_1.VttechApiService])
], PbxSyncService);
//# sourceMappingURL=pbx-sync.service.js.map