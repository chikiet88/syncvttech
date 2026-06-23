
import { Controller, Get, Post, Query, Param, Body, Patch, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { SyncService } from './sync.service';
import { PbxSyncService } from './pbx-sync.service';
import { PrismaService } from './prisma.service';
import { VttechApiService } from './vttech-api.service';
import { ExcelExportService } from './excel-export.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly syncService: SyncService,
    private readonly pbxSync: PbxSyncService,
    private readonly prisma: PrismaService,
    private readonly vttechApi: VttechApiService,
    private readonly excelExportService: ExcelExportService,
  ) {}

  @Get('check-login')
  async checkLogin(@Query('user') user?: string, @Query('pass') pass?: string) {
    return this.vttechApi.checkLoginStatus();
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

  @Get('sync/reset-queue')
  async resetQueue() {
    return this.syncService.resetQueue();
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
    const total = await this.prisma.syncTask.count();
    const success = await this.prisma.syncTask.count({ where: { status: 'SUCCESS' } });
    const progress = total > 0 ? (success / total) * 100 : 0;
    const details = await this.prisma.syncTask.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    
    // Aggregates for detailed metrics
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
       } as any
    });

    const sum = (aggregates as any)._sum;
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

  @Get('branches')
  async getBranches() {
    return this.prisma.branch.findMany({
      where: { is_active: 1 },
      orderBy: { name: 'asc' },
    });
  }

  @Get('cron-configs')
  async getCronConfigs() {
    // Seed default cron configs
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

    const result = await Promise.all(
      configs.map(async (config) => {
        let recentTasks: any[] = [];
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
        } else if (config.id === 'handleDailySync') {
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
        } else if (config.id === 'handleDailyReporting') {
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
        } else if (config.id === 'handleHistoricalSyncCron') {
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
        } else {
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
      })
    );

    return result;
  }

  @Patch('cron-configs/:id')
  async updateCronConfig(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.prisma.cronConfig.update({
      where: { id },
      data: { enabled: body.enabled },
    });
  }

  @Get('reports/appointments/export')
  async exportAppointments(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId: string,
    @Res() res: any,
  ) {
    try {
      if (!from || !to) {
        return res.status(400).json({ error: 'Both from and to dates are required (format: YYYY-MM-DD)' });
      }
      const buffer = await this.excelExportService.exportAppointmentsToExcel(from, to, branchId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=DSKH_TAZA_2026_LICH_HEN.xlsx`);
      return res.send(buffer);
    } catch (error) {
      console.error('Failed to export appointments:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  @Post('reports/appointments/push-google-sheet')
  async pushGoogleSheet(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: any,
  ) {
    try {
      if (!from || !to) {
        return res.status(400).json({ error: 'Both from and to dates are required (format: YYYY-MM-DD)' });
      }
      const result = await this.excelExportService.pushToGoogleSheet(from, to);
      return res.json(result);
    } catch (error) {
      console.error('Failed to push appointments to Google Sheets:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  @Post('sync/tab-manual')
  async syncTabManual(
    @Body() body: { tabId: string; fromDate: string; toDate: string },
  ) {
    const { tabId, fromDate, toDate } = body;
    if (!tabId || !fromDate || !toDate) {
      throw new HttpException(
        'Vui lòng cung cấp đầy đủ: tabId, fromDate, toDate',
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.syncService.triggerManualTabSync(tabId, fromDate, toDate);
    return {
      success: true,
      message: `Đã nạp thành công ${result.pushed} khách hàng vào hàng đợi để đồng bộ tab này.`,
      ...result,
    };
  }
}
