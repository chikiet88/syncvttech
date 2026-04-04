
import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SyncService } from './sync.service';
import { PbxSyncService } from './pbx-sync.service';
import { PrismaService } from './prisma.service';
import { VttechApiService } from './vttech-api.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly syncService: SyncService,
    private readonly pbxSync: PbxSyncService,
    private readonly prisma: PrismaService,
    private readonly vttechApi: VttechApiService,
  ) {}

  @Get('check-login')
  async checkLogin(@Query('user') user?: string, @Query('pass') pass?: string) {
    return this.vttechApi.checkLoginStatus(user, pass);
  }

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

  @Get('sync/revenue')
  async triggerRevenueSync(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
  ) {
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

  @Get('sync/seed-tasks')
  async seedTasks(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) throw new Error('Cần cung cấp from và to (YYYY-MM-DD)');
    const result = await this.syncService.seedSyncTasks(from, to);
    return {
      message: `Đã khởi tạo xong ${result.created} task mới.`,
      ...result
    };
  }

  @Get('sync/start-tasks')
  async startTasks(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit) : 1000;
    const result = await this.syncService.pushPendingTasksToQueue(take);
    return {
      message: `Đã đẩy ${result.pushed} task vào hàng đợi xử lý.`,
      ...result
    };
  }

  @Get('sync/tasks-summary')
  async getTasksSummary() {
    const summary = await this.prisma.syncTask.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    
    const total = await this.prisma.syncTask.count();
    const success = await this.prisma.syncTask.count({ where: { status: 'SUCCESS' } });
    
    return {
      total,
      success,
      progress: total > 0 ? (success / total) * 100 : 0,
      details: summary
    };
  }

  @Get('branches')
  async getBranches() {
    return this.prisma.branch.findMany({
      where: { is_active: 1 },
      orderBy: { name: 'asc' },
    });
  }
}
