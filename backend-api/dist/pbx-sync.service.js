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
        const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleDailyPbxSync' } }).catch(() => null);
        if (config && !config.enabled) {
            this.logger.log('🚫 [CRON] handleDailyPbxSync bị vô hiệu hóa trong cấu hình.');
            return;
        }
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
                if (!record || !record.uuid) {
                    this.logger.warn(`Skipping CDR record without UUID: ${JSON.stringify(record)}`);
                    failedCount++;
                    continue;
                }
                try {
                    await this.prisma.pbxCallRecord.upsert({
                        where: { uuid: String(record.uuid) },
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
                    this.logger.error(`❌ [Loicansua] Error upserting record ${record.uuid}: ${error.message}`);
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
            this.logger.error(`❌ [Loicansua] Error in syncCdr: ${error.message}`);
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
            let records = [];
            if (Array.isArray(result)) {
                records = result;
            }
            else if (result && typeof result === 'object') {
                records = result.data || result.Data || result.Table || result.Items || [];
            }
            if (!Array.isArray(records)) {
                this.logger.warn('No valid extension records found in API response');
                return 0;
            }
            let count = 0;
            for (const record of records) {
                if (!record || typeof record !== 'object' || !record.ID || !record.Extension) {
                    this.logger.warn(`Skipping invalid extension record: ${JSON.stringify(record)}`);
                    continue;
                }
                await this.prisma.pbxExtension.upsert({
                    where: { vttech_id: parseInt(record.ID) },
                    create: {
                        vttech_id: parseInt(record.ID),
                        extension: String(record.Extension),
                        password: record.Password ? String(record.Password) : null,
                        is_active: 1,
                        raw_data: record,
                    },
                    update: {
                        extension: String(record.Extension),
                        password: record.Password ? String(record.Password) : null,
                        raw_data: record,
                    },
                });
                count++;
            }
            this.logger.log(`✅ Synced ${count} extensions`);
            return count;
        }
        catch (error) {
            this.logger.error(`❌ [Loicansua] Error syncing extensions: ${error.message}`);
            throw error;
        }
    }
    async syncPbxEmployees() {
        this.logger.log('🔄 Syncing Call Center Employees from VTTech...');
        try {
            const groups = await this.vttechApi.fetchTicketGroups();
            let groupList = [];
            if (Array.isArray(groups)) {
                groupList = groups;
            }
            else if (groups && typeof groups === 'object') {
                groupList = groups.data || groups.Data || groups.Table || groups.Items || [];
            }
            if (!Array.isArray(groupList)) {
                this.logger.warn('No valid ticket group records found in API response');
                return 0;
            }
            let count = 0;
            for (const group of groupList) {
                if (!group || typeof group !== 'object')
                    continue;
                const members = group.Members || group.data || group.Data || [];
                if (!Array.isArray(members))
                    continue;
                for (const member of members) {
                    const memberId = member.EmployeeId || member.Id;
                    const memberName = member.EmployeeName || member.Name;
                    if (!memberId || !memberName) {
                        this.logger.warn(`Skipping invalid employee record: ${JSON.stringify(member)}`);
                        continue;
                    }
                    await this.prisma.pbxEmployee.upsert({
                        where: { vttech_id: parseInt(memberId) },
                        create: {
                            vttech_id: parseInt(memberId),
                            name: String(memberName),
                            code: member.EmployeeCode || member.Code ? String(member.EmployeeCode || member.Code) : null,
                            phone: member.Mobile || member.Phone ? String(member.Mobile || member.Phone) : null,
                            extension: member.Extension || member.Ext ? String(member.Extension || member.Ext) : null,
                            group_id: group.Id ? parseInt(group.Id) : null,
                            group_name: group.Name ? String(group.Name) : null,
                            department: member.Department ? String(member.Department) : null,
                            position: member.Position ? String(member.Position) : null,
                            is_active: 1,
                            raw_data: member,
                        },
                        update: {
                            name: String(memberName),
                            code: member.EmployeeCode || member.Code ? String(member.EmployeeCode || member.Code) : null,
                            phone: member.Mobile || member.Phone ? String(member.Mobile || member.Phone) : null,
                            extension: member.Extension || member.Ext ? String(member.Extension || member.Ext) : null,
                            group_id: group.Id ? parseInt(group.Id) : null,
                            group_name: group.Name ? String(group.Name) : null,
                            department: member.Department ? String(member.Department) : null,
                            position: member.Position ? String(member.Position) : null,
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
            this.logger.error(`❌ [Loicansua] Error syncing PBX employees: ${error.message}`);
            throw error;
        }
    }
    async syncVttechCallHistory(dateFrom, dateTo) {
        this.logger.log(`🔄 Syncing Call History from VTTech Portal (${dateFrom} - ${dateTo})...`);
        const syncLog = await this.prisma.pbxSyncLog.create({
            data: {
                sync_type: 'vttech_call_history',
                status: 'running',
                date_from: new Date(dateFrom),
                date_to: new Date(dateTo),
            },
        });
        try {
            const result = await this.vttechApi.fetchCallHistory(dateFrom, dateTo);
            let records = [];
            if (Array.isArray(result)) {
                records = result;
            }
            else if (result && typeof result === 'object') {
                records = result.Table || result.data || result.Data || result.Items || [];
            }
            this.logger.log(`📥 Fetched ${records.length} call history records from VTTech Portal`);
            let successCount = 0;
            let failedCount = 0;
            for (const record of records) {
                if (!record)
                    continue;
                const callId = String(record.CallID || record.ID || record.id || '');
                if (!callId) {
                    failedCount++;
                    continue;
                }
                try {
                    let statusStr = String(record.StatusName || record.Status || '');
                    let callStatus = 'UNKNOWN';
                    if (statusStr.includes('Hoàn tất') || statusStr.toLowerCase().includes('answered'))
                        callStatus = 'ANSWERED';
                    else if (statusStr.includes('Gọi nhỡ') || statusStr.toLowerCase().includes('no answer'))
                        callStatus = 'NO_ANSWER';
                    else if (statusStr.includes('Bận') || statusStr.toLowerCase().includes('busy'))
                        callStatus = 'BUSY';
                    else if (statusStr.includes('Hủy'))
                        callStatus = 'CANCELED';
                    const duration = parseInt(record.Duration || '0');
                    const startTime = record.DateCall ? new Date(record.DateCall) : (record.Time ? new Date(record.Time) : null);
                    const direction = record.Direction || (record.Type === '1' ? 'outbound' : 'inbound');
                    await this.prisma.pbxCallRecord.upsert({
                        where: { uuid: callId },
                        create: {
                            uuid: callId,
                            direction: direction,
                            caller_id_number: String(record.From || ''),
                            destination_number: String(record.To || record.Phone || ''),
                            duration: duration,
                            billsec: duration,
                            call_status: callStatus,
                            record_path: record.LinkRecord || record.LinkAudio || record.Link || null,
                            start_time: startTime,
                            raw_data: record,
                        },
                        update: {
                            direction: direction,
                            caller_id_number: String(record.From || ''),
                            destination_number: String(record.To || record.Phone || ''),
                            duration: duration,
                            billsec: duration,
                            call_status: callStatus,
                            record_path: record.LinkRecord || record.LinkAudio || record.Link || null,
                            start_time: startTime,
                            raw_data: record,
                            updated_at: new Date(),
                        },
                    });
                    successCount++;
                }
                catch (error) {
                    this.logger.error(`❌ [Loicansua] Error upserting VTTech call record ${callId}: ${error.message}`);
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
            this.logger.error(`❌ [Loicansua] Error in syncVttechCallHistory: ${error.message}`);
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