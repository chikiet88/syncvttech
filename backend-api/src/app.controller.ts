
import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SyncService } from './sync.service';
import { PbxSyncService } from './pbx-sync.service';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly syncService: SyncService,
    private readonly pbxSync: PbxSyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('sync')
  async triggerSync(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
    @Query('forceMaster') forceMaster?: string,
    @Query('syncPbx') syncPbx?: string,
    @Query('syncDetails') syncDetails?: string,
  ) {
    const dateFrom = from || date || new Date().toISOString().split('T')[0];
    const dateTo = to || date || dateFrom;
    const isForceMaster = forceMaster === 'true' || forceMaster === '1';
    const isSyncPbx = syncPbx === 'true' || syncPbx === '1';
    const isSyncDetails = syncDetails === 'true' || syncDetails === '1' || syncDetails === undefined; // Mặc định là true nếu không truyền

    // Chạy đồng bộ trong background để tránh timeout request
    this.syncService.syncByRange(dateFrom, dateTo, isForceMaster, isSyncPbx, isSyncDetails).catch(err => {
      console.error('Background sync failed:', err);
    });
    
    return {
      message: `Đã bắt đầu quá trình đồng bộ từ: ${dateFrom} đến ${dateTo}`,
      status: 'processing'
    };
  }

  @Get('sync/stop')
  async stopSync() {
    this.syncService.stopSync();
    return { message: 'Đang gửi yêu cầu dừng đồng bộ...' };
  }

  @Get('sync/pbx')
  async triggerPbxSync(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
  ) {
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

  @Get('sync/pbx-master')
  async triggerPbxMasterSync() {
    this.pbxSync.syncExtensions().catch(err => console.error(err));
    this.pbxSync.syncPbxEmployees().catch(err => console.error(err));
    return { message: 'Đã bắt đầu đồng bộ Extensions và Employees' };
  }

  @Get('monitoring/logs')
  async getCrawlLogs(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit) : 100;
    const logs = await this.syncService.getLogs(take);
    return logs;
  }

  @Get('monitoring/pbx-logs')
  async getPbxLogs(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit) : 100;
    return this.prisma.pbxSyncLog.findMany({
      take: take,
      orderBy: { created_at: 'desc' },
    });
  }

  @Get('sync/status')
  async getSyncStatus() {
    return this.syncService.getSyncStatus();
  }
}
