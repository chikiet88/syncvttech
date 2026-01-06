import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { PbxApiService } from './pbx-api.service';
import { VttechApiService } from './vttech-api.service';

@Injectable()
export class PbxSyncService {
  private readonly logger = new Logger(PbxSyncService.name);

  constructor(
    private prisma: PrismaService,
    private pbxApi: PbxApiService,
    private vttechApi: VttechApiService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailyPbxSync() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    await this.syncExtensions();
    await this.syncPbxEmployees();
    await this.syncCdr(dateStr, dateStr);
  }

  async syncCdr(dateFrom: string, dateTo: string) {
    this.logger.log(`🔄 Syncing CDR from ${dateFrom} to ${dateTo}...`);
    
    // Create sync log
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
              end_time: record.end_epoch? new Date(record.end_epoch * 1000) : null,
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
              end_time: record.end_epoch? new Date(record.end_epoch * 1000) : null,
              raw_data: record,
            },
          });
          successCount++;
        } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      this.logger.error(`Error syncing PBX employees: ${error.message}`);
      throw error;
    }
  }
}
