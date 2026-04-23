
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as CryptoJS from 'crypto-js';
import { VttechApiService } from './vttech-api.service';
import { PrismaService } from './prisma.service';
import { PbxSyncService } from './pbx-sync.service';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);

  private syncStatus = {
    isSyncing: false,
    progress: 0,
    total: 0,
    current: 0,
    message: '',
    logs: [] as string[],
    startTime: null as number | null,
    endTime: null as number | null,
    error: null as string | null,
    shouldStop: false,
  };

  private knownSourceIds = new Set<number>();
  private knownBranchIds = new Set<number>();
  private knownMembershipIds = new Set<number>();

  constructor(
    private vttechApi: VttechApiService,
    private prisma: PrismaService,
    private pbxSync: PbxSyncService,
    @InjectQueue('sync-queue') private syncQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 [STARTUP] Đang kiểm tra kết nối API VTTech...');
    // Chạy ngầm để không chặn việc mở Port 5001
    this.vttechApi.checkLoginStatus().then(result => {
      if (result.success) {
        this.logger.log(`✅ [STATUS] ${result.message} (${result.accounts} accounts)`);
      } else {
        this.logger.error(`❌ [Loicansua] [LOGIN FAILED] ${result.message}`);
      }
    }).catch(err => {
      this.logger.error(`🔥 [STARTUP ERROR] ${err.message}`);
    });
  }

  getSyncStatus() {
    return this.syncStatus;
  }

  stopSync() {
    if (this.syncStatus.isSyncing) {
      this.syncStatus.shouldStop = true;
      this.addLog('🛑 Đang yêu cầu dừng đồng bộ...');
    }
  }

  async resetQueue() {
    this.addLog('🧹 Đang xóa hàng đợi và đặt lại trạng thái...');
    
    // 1. Dừng quá trình đang chạy
    this.syncStatus.shouldStop = true;
    this.syncStatus.isSyncing = false;

    // 2. Xóa các job trong BullMQ
    try {
      await this.syncQueue.drain(true);
      await this.syncQueue.clean(0, 1000, 'active');
      await this.syncQueue.clean(0, 1000, 'wait');
      await this.syncQueue.clean(0, 1000, 'delayed');
      await this.syncQueue.clean(0, 1000, 'failed');
      this.addLog('✅ Đã xóa các Job trong BullMQ');
    } catch (e) {
      this.addLog(`⚠️ Lỗi khi xóa BullMQ: ${e.message}`);
    }

    // 3. Cập nhật database: Chuyển PROCESSING/FAILED về PENDING hoặc xóa hết
    // Ở đây ta xóa hết để người dùng có thể Start lại từ đầu (Khởi tạo Task mới)
    try {
      const deleted = await this.prisma.syncTask.deleteMany({});
      this.addLog(`✅ Đã xóa ${deleted.count} task trong Database`);
    } catch (e) {
      this.addLog(`⚠️ Lỗi khi xóa SyncTasks: ${e.message}`);
    }

    // 4. Reset status object
    this.syncStatus = {
      isSyncing: false,
      progress: 0,
      total: 0,
      current: 0,
      message: 'Đã đặt lại hàng đợi.',
      logs: this.syncStatus.logs,
      startTime: null,
      endTime: null,
      error: null,
      shouldStop: false,
    };

    return { success: true };
  }

  private addLog(message: string) {
    const log = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.syncStatus.logs.push(log);
    this.logger.log(message);
    
    // Giới hạn logs để không quá nặng
    if (this.syncStatus.logs.length > 500) {
      this.syncStatus.logs.shift();
    }
  }

  private ensureArray(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (typeof res !== 'object') return [];

    // Check common VTTech table wrappers
    const possible = res.Table || res.data || res.Data || res.Items || res.Table1;
    if (Array.isArray(possible)) return possible;
    
    // Handle objects with numeric keys: { "0": {...}, "1": {...} }
    const target = possible || res;
    const keys = Object.keys(target);
    if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
      return Object.values(target);
    }

    return [];
  }

  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    
    const s = String(dateValue).trim();
    if (!s) return null;

    // Handle YYYYMMDDHHMMSS or YYYYMMDD (Common in VTTech logs)
    if (/^\d{8,14}$/.test(s)) {
      const y = parseInt(s.substring(0, 4));
      const m = parseInt(s.substring(4, 6));
      const d = parseInt(s.substring(6, 8));
      const date = new Date(y, m - 1, d, 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
    const match = s.match(ddmmyyyy);
    if (match) {
      const d = parseInt(match[1]);
      const m = parseInt(match[2]);
      const y = parseInt(match[3]);
      
      const date = new Date(y, m - 1, d, 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle YYYY-MM-DD
    const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
    const match2 = s.match(yyyymmdd);
    if (match2) {
      const y = parseInt(match2[1]);
      const m = parseInt(match2[2]);
      const d = parseInt(match2[3]);
      const date = new Date(y, m - 1, d, 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Last resort
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
       // Normalize to noon to avoid TZ issues
       d.setHours(12, 0, 0, 0);
       return d;
    }
    return null;
  }


  private formatDate(date: any): string {
    if (!date) return '';
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return String(date).replace(/-/g, '/');
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySync() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    await this.syncByRange(dateStr, dateStr);
  }

  @Cron('0 */5 * * * *')
  async handleHeartbeat() {
    this.logger.log('💓 [HEARTBEAT] Đang duy trì nhịp đập Session cho các tài khoản...');
    try {
      const result = await this.vttechApi.checkLoginStatus();
      if (result.success) {
        this.logger.log(`✅ [HEARTBEAT] Session ổn định (${result.accounts} tài khoản)`);
      } else {
        this.logger.warn(`⚠️ [HEARTBEAT] Phát hiện Session yếu: ${result.message}`);
        // Tự động kích hoạt re-login nếu cần thiết thông qua checkLoginStatus nội bộ
      }
    } catch (e) {
      this.logger.error(`🔥 [HEARTBEAT ERROR] ${e.message}`);
    }
  }

  @Cron('0 */20 * * * *')
  async handleFrequentSync() {
    const today = new Date().toISOString().split('T')[0];
    this.logger.log(`[CRON] Bắt đầu đồng bộ định kỳ 20p cho ngày ${today}`);
    // Sync current day without PBX but with detail workers
    try {
      if (this.syncStatus.isSyncing) {
        this.addLog('⏩ Đồng bộ định kỳ 20p bỏ qua do hệ thống đang bận.');
        return;
      }
      await this.syncByRange(today, today, false, false, true);
    } catch (e) {
      this.logger.error(`Lỗi đồng bộ 20p: ${e.message}`);
    }
  }

  @Cron('0 */30 * * * *') // Mỗi 30 phút kiểm tra và giải quyết 1 phần dữ liệu cũ
  async handleHistoricalSyncCron() {
    this.logger.log('[CRON] Đang kiểm tra tác vụ đồng bộ lịch sử (Backlog)...');
    
    // Kiểm tra tải hệ thống qua hàng đợi BullMQ
    try {
      const counts = await this.syncQueue.getJobCounts();
      if (counts.waiting > 150 || counts.active > 20) {
        this.logger.log(`⏩ Tạm hoãn đồng bộ lịch sử do Queue đang bận (Waiting: ${counts.waiting}, Active: ${counts.active})`);
        return;
      }

      // Lấy 50 task PENDING cũ nhất (trước ngày hôm nay)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingTasks = await this.prisma.syncTask.findMany({
        where: {
          status: 'PENDING',
          date: { lt: today }
        },
        orderBy: [
          { date: 'asc' }, // Ưu tiên cày từ quá khứ (2019) trở lên theo yêu cầu
          { id: 'asc' }
        ],
        take: 100 // Tăng tốc độ cày backlog lên 100 task mỗi 30 phút
      });

      if (pendingTasks.length === 0) {
        this.logger.log('✅ Không còn task lịch sử nào cần xử lý.');
        return;
      }

      this.logger.log(`🚀 Đang phân bổ ${pendingTasks.length} task lịch sử vào Worker với Priority 10...`);
      for (const task of pendingTasks) {
        // Đánh dấu PROCESSING để tránh bị nhặt lại trong cùng phiên
        await this.prisma.syncTask.update({
          where: { id: task.id },
          data: { status: 'PROCESSING', last_run_at: new Date() }
        });

        await this.syncQueue.add('sync-job', {
          type: 'sync-task',
          data: { taskId: task.id }
        }, {
          jobId: `hist-task-${task.id}`,
          priority: 10, // Độ ưu tiên thấp hơn dữ liệu mới (thường là 5)
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 }
        });
      }
    } catch (e) {
      this.logger.error(`Lỗi trong handleHistoricalSyncCron: ${e.message}`);
    }
  }

  @Cron('0 0 8,20 * * *') // Báo cáo định kỳ lúc 08:00 và 20:00
  async handleDailyReporting() {
    this.logger.log('[CRON] Đang tổng hợp báo cáo giám sát đồng bộ hàng ngày...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Thống kê dữ liệu trong ngày
      const tasksToday = await this.prisma.syncTask.findMany({
        where: { date: today }
      });

      const successCount = tasksToday.filter(t => t.status === 'SUCCESS').length;
      const totalRev = tasksToday.reduce((sum, t) => sum + t.revenue_total, 0);
      const totalCustomers = tasksToday.reduce((sum, t) => sum + t.customers_count, 0);

      // 2. Thống kê backlog
      const remainingPending = await this.prisma.syncTask.count({
        where: { status: 'PENDING', date: { lt: today } }
      });

      const reportMessage = `📊 [AUTO REPORT] ${new Date().getHours() === 8 ? 'Sáng' : 'Tối'}: ` +
        `Đã hoàn tất ${successCount}/${tasksToday.length} nhánh trong ngày. ` +
        `KH mới: ${totalCustomers}, Doanh thu: ${totalRev.toLocaleString()}đ. ` +
        `Dữ liệu cũ (Backlog) còn lại: ${remainingPending} task.`;

      // Lưu log báo cáo để hiển thị tại /monitoring/sync (Dashboard đọc từ CrawlLog)
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: today,
          crawl_type: 'DAILY_REPORT',
          status: 'success',
          message: reportMessage,
          customers_count: totalCustomers,
          revenue_total: totalRev,
          records_count: successCount,
          total_customers: remainingPending,
          total_branches: tasksToday.length
        }
      });

      this.addLog(reportMessage);
    } catch (e) {
      this.logger.error(`Lỗi tạo báo cáo: ${e.message}`);
    }
  }

  async syncRevenue(dateFrom: string, dateTo: string) {
    if (this.syncStatus.isSyncing) {
      throw new Error('Một quy trình đồng bộ khác đang chạy.');
    }

    const startTime = Date.now();
    this.syncStatus = {
      isSyncing: true,
      progress: 0,
      total: 0,
      current: 0,
      message: `Bắt đầu đồng bộ DOANH THU từ ${dateFrom} đến ${dateTo}...`,
      logs: [],
      startTime: startTime,
      endTime: null,
      error: null,
      shouldStop: false,
    };

    this.addLog(`🚀 Bắt đầu đồng bộ DOANH THU (Range: ${dateFrom} - ${dateTo})`);

    try {
      this.vttechApi.setLogCallback((msg) => this.addLog(msg));
      await this.vttechApi.login();
      await this.vttechApi.getXsrfToken();
      const branches = await this.prisma.branch.findMany({ where: { is_active: 1 } });
      
      await this.executeRevenueSync(dateFrom, dateTo, branches);

      this.syncStatus.endTime = Date.now();
      this.addLog(`✅ Hoàn thành đồng bộ Doanh thu.`);
    } catch (error) {
      this.syncStatus.error = error.message;
      this.addLog(`❌ [Loicansua] Lỗi đồng bộ doanh thu: ${error.message}`);
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  private async executeRevenueSync(dateFrom: string, dateTo: string, branches: any[]) {
    const start = this.parseDate(dateFrom);
    const end = this.parseDate(dateTo);
    if (!start || !end) throw new Error('Ngày không hợp lệ');

    const days: string[] = [];
    let currentDay = new Date(start);
    while (currentDay <= end) {
      days.push(currentDay.toISOString().split('T')[0]);
      currentDay.setDate(currentDay.getDate() + 1);
    }

    const totalSteps = days.length * branches.length;
    let currentStep = 0;
    const syncedCustomerIds = new Set<number>();

    for (const dateStr of days) {
      if (this.syncStatus.shouldStop) break;
      this.addLog(`📅 Ngày Doanh thu: ${dateStr}`);

      for (const branch of branches) {
        if (this.syncStatus.shouldStop) break;
        currentStep++;
        
        try {
          // Push Revenue Sync job for this day/branch
          await this.syncQueue.add('sync-job', {
            type: 'sync-revenue-day',
            data: { date: dateStr, branchId: branch.id }
          }, {
            backoff: { type: 'exponential', delay: 1000 },
            attempts: 3,
          });

          // Find customers with registration or activity on this day (Type 5 per docs)
          const foundIds = await this.syncCustomers(dateStr, dateStr, 5, branch.id);
          for (const cId of foundIds) {
            if (cId && !syncedCustomerIds.has(cId)) {
              await this.syncQueue.add('sync-job', {
                type: 'sync-customer-detail',
                data: { customerId: cId }
              }, {
                priority: 10,
                attempts: 5,
                backoff: { type: 'exponential', delay: 2000 },
              });
              syncedCustomerIds.add(cId);
            }
          }
        } catch (e) {
          this.addLog(`  ❌ [${branch.name}] Lỗi khi đẩy Job doanh thu: ${e.message}`);
        }
      }
    }
    
    // Lưu log vào DB
    const duration = (Date.now() - (this.syncStatus.startTime || Date.now())) / 1000;
    await this.prisma.crawlLog.create({
      data: {
        crawl_date: start,
        crawl_type: 'revenue_sync',
        status: 'success',
        records_count: syncedCustomerIds.size,
        total_branches: branches.length,
        total_customers: syncedCustomerIds.size,
        duration_seconds: duration,
      },
    });
  }

  async syncByRange(dateFrom: string, dateTo: string, forceMaster: boolean = false, syncPbx: boolean = false, syncDetails: boolean = true) {
    if (this.syncStatus.isSyncing) {
      throw new Error('Một quy trình đồng bộ khác đang chạy.');
    }

    const startTime = Date.now();

    // Reset status
    this.syncStatus = {
      isSyncing: true,
      progress: 0,
      total: 0,
      current: 0,
      message: `Bắt đầu đồng bộ từ ${dateFrom} đến ${dateTo}...`,
      logs: [],
      startTime: startTime,
      endTime: null,
      error: null,
      shouldStop: false,
    };

    this.addLog(`🚀 Bắt đầu quá trình đồng bộ (Range: ${dateFrom} - ${dateTo})`);

    try {
      // Đăng ký nhận log chi tiết từ API Service
      this.vttechApi.setLogCallback((msg) => this.addLog(msg));

      this.syncStatus.message = 'Đang đăng nhập VTTech...';
      const loggedIn = await this.vttechApi.login();
      if (!loggedIn) throw new Error('Đăng nhập thất bại');
      // this.addLog('✅ Đăng nhập thành công'); // Đã có log trong service

      this.syncStatus.message = 'Đang lấy XSRF Token...';
      await this.vttechApi.getXsrfToken();
      // this.addLog('✅ Đã lấy Token'); // Đã có log trong service

      // 1. Đồng bộ Master Data (Danh mục)
      await this.syncMasterData(forceMaster);

      const branches = await this.prisma.branch.findMany();
      const days: string[] = [];
      let curr = new Date(dateFrom);
      const end = new Date(dateTo);
      while (curr <= end) {
        days.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }

      let currentStep = 0;
      const totalSteps = days.length * branches.length;
      for (const dateStr of days) {
        this.addLog(`📅 --- Bắt đầu đồng bộ ngày: ${dateStr} ---`);
        
        // Đồng bộ từng chi nhánh trong ngày
        for (let i = 0; i < branches.length; i++) {
          if (this.syncStatus.shouldStop) break;
          currentStep++;
          const branch = branches[i];
          this.syncStatus.message = `Đang đồng bộ ${dateStr} (${currentStep}/${totalSteps}): ${branch.name}`;
          this.syncStatus.progress = Math.round((currentStep / totalSteps) * 90);

          // 1. Lấy danh sách khách hàng và lịch hẹn
          const branchCustomerIds: number[] = [];
          let appointmentCount = 0;
          try {
            const [ids5, ids2, ids3, appIds] = await Promise.all([
              this.syncCustomers(dateStr, dateStr, 5, branch.id).catch(() => []),
              this.syncCustomers(dateStr, dateStr, 2, branch.id).catch(() => []),
              this.syncCustomers(dateStr, dateStr, 3, branch.id).catch(() => []),
              this.syncAppointments(dateStr, dateStr, branch.id).catch(() => []),
            ]);
            branchCustomerIds.push(...ids5, ...ids2, ...ids3, ...appIds);
            appointmentCount = appIds.length;
          } catch (e) {
            this.addLog(`  ❌ [${branch.name}] Lỗi khi quét khách hàng/lịch hẹn: ${e.message}`);
          }

          // 2. Lấy dữ liệu tài chính từ 3 nguồn API
          let daySales = 0;
          let dayRevenue = 0;
          try {
            const [revData, payData, depData] = await Promise.all([
              this.vttechApi.getRevenueByBranch(dateStr, dateStr, branch.id).then((r: any) => this.ensureArray(r)),
              this.vttechApi.getPaymentByBranch(dateStr, dateStr, branch.id).then((r: any) => this.ensureArray(r)),
              this.vttechApi.getDepositByBranch(dateStr, dateStr, branch.id).then((r: any) => this.ensureArray(r)),
            ]);

            // 1. Khử trùng dữ liệu thô THÔNG MINH (Invoice + Amount)
            const deduplicatedMap = new Map<string, any>();
            [...revData, ...payData, ...depData].forEach(item => {
              // Khóa: Mã hóa đơn + Số tiền dịch vụ + Khách hàng
              const financialKey = `${item.doc_code || 'none'}-${item.CustomerID || '0'}-${item.PriceDiscounted || 0}`;
              
              if (!deduplicatedMap.has(financialKey)) {
                deduplicatedMap.set(financialKey, { ...item });
              } else {
                const existing = deduplicatedMap.get(financialKey);
                existing.Paid = Math.max(existing.Paid || 0, item.Paid || 0);
              }
            });
            const allItems = Array.from(deduplicatedMap.values());

            // 2. Làm sạch triệt để dữ liệu cũ
            const syncDate = this.parseDate(dateStr) || new Date();
            const nextDate = new Date(syncDate.getTime() + 24 * 60 * 60 * 1000);

            await Promise.all([
              this.prisma.revenueTransaction.deleteMany({
                where: { branch_id: branch.id, date: { gte: syncDate, lt: nextDate } }
              }),
              this.prisma.syncTask.deleteMany({
                where: { branch_id: branch.id, date: syncDate, type: 'HEADER' }
              })
            ]);

            // 3. Tạo mới SyncTask và chèn dữ liệu giao dịch
            const task = await this.prisma.syncTask.create({
              data: {
                date: syncDate,
                branch_id: branch.id,
                branch_name: branch.name,
                type: 'HEADER',
                status: 'PROCESSING',
                records_count: allItems.length,
              }
            });

            for (const item of allItems) {
              const mapped = this.mapRevenueItem(item, branch.id, dateStr);
              if (mapped.customer_id) branchCustomerIds.push(mapped.customer_id);
              
              const { id, ...dataWithoutId } = mapped as any;
              await this.prisma.revenueTransaction.create({ data: dataWithoutId });
            }

            // 6. Tính toán tổng CHUẨN từ Database (Khớp với Dashboard 143.9M)
            const totals = await this.prisma.revenueTransaction.aggregate({
              where: { branch_id: branch.id, date: { gte: syncDate, lt: nextDate } },
              _sum: { amount: true, paid: true }
            });

            daySales = totals._sum.amount || 0;
            dayRevenue = totals._sum.paid || 0;

            // 7. Cập nhật kết quả cuối cùng vào SyncTask
            const uniqueBranchIds = [...new Set(branchCustomerIds)];
            await this.prisma.syncTask.update({
              where: { id: task.id },
              data: {
                customers_count: uniqueBranchIds.length,
                appointments_count: appointmentCount,
                sales_total: daySales,
                revenue_total: dayRevenue,
                total_details: uniqueBranchIds.length,
                completed_details: 0,
                status: 'COMPLETED',
                updated_at: new Date(),
              } as any,
            });

            this.addLog(`  ✅ [${branch.name}] Khớp số: Sales ${daySales.toLocaleString()} | Rev ${dayRevenue.toLocaleString()}`);
          } catch (e) {
            this.addLog(`  ❌ [${branch.name}] Lỗi nghiêm trọng khi đồng bộ: ${e.message}`);
          }
        }
      }
      this.syncStatus.progress = 100;
      this.syncStatus.message = 'Hoàn tất!';
      this.syncStatus.endTime = Date.now();
    } catch (error) {
      this.syncStatus.error = error.message;
      this.syncStatus.message = 'Lỗi đồng bộ!';
      this.addLog(`❌ Lỗi hệ thống: ${error.message}`);
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  async syncByDate(dateStr: string) {
    return this.syncByRange(dateStr, dateStr);
  }

  private async syncCustomers(dateFrom: string, dateTo: string, type: number = 1, branchId: number = 0): Promise<number[]> {
    let start = 0;
    const length = 100;
    let hasMore = true;
    const customerIds: number[] = [];

    while (hasMore) {
      if (this.syncStatus.shouldStop) break;
      let res: any = null;
      try {
        res = await this.vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
          dateFrom: dateFrom,
          dateTo: dateTo,
          branchID: branchId.toString(),
          type: type,
          BeginID: start,
          BeginCustID: 0,
          Limit: length,
        });
      } catch (e) {
        this.addLog(`   ❌ [Loicansua] [SyncCustomers] Lỗi API (Type ${type}): ${e.message}`);
        hasMore = false; 
        break;
      }

      const dataItems = this.ensureArray(res);

      if (dataItems.length > 0) {
        this.addLog(`  📥 Nhận được ${dataItems.length} khách hàng từ bản ghi thứ ${start} (Type: ${type})`);
        for (const c of dataItems) {
          try {
            const id = parseInt(c.CustID || c.ID || c.id);
            if (!id) continue;

            const name = c.CustName || c.FullName || c.Name || 'Unknown';
            const phone = c.Phone || c.Mobile || '';
            const email = c.Email || c.Email1 || '';
            const paid = parseFloat(c.TotalPaid || c.Amount || c.TotalAmount || 0);
            
            let debt = 0;
            if (c.TotalRaise !== undefined && c.TotalPaid !== undefined) {
                debt = parseFloat(c.TotalRaise) - parseFloat(c.TotalPaid);
            } else {
                debt = parseFloat(c.Debt || c.RemainAmount || 0);
            }

            const branchIdFromData = parseInt(c.BranchID || c.branch_id) || branchId || null;
            const gender = parseInt(c.GenderID || c.Gender) || null;
            const birthday = this.parseDate(c.Birth || c.Birthday);
            const address = c.Address || '';
            const sourceId = parseInt(c.SourceID) || null;

            if (sourceId) {
              await this.ensureSourceExists(sourceId);
            }
            if (branchIdFromData) {
              await this.ensureBranchExists(branchIdFromData);
            }

            const currentHash = this.generateHash({ name, phone, email, paid, debt, branchIdFromData, gender, birthday, address, sourceId });
            const existingCustomer = await this.prisma.customer.findUnique({ where: { id } });

            if (!existingCustomer || existingCustomer.last_hash !== currentHash) {
              await this.prisma.customer.upsert({
                where: { id },
                update: {
                  name,
                  phone,
                  email,
                  total_spent: paid,
                  total_debt: debt,
                  branch_id: branchIdFromData,
                  gender,
                  birthday,
                  address,
                  source_id: sourceId,
                  last_hash: currentHash,
                },
                create: {
                  id,
                  name,
                  phone,
                  email,
                  total_spent: paid,
                  total_debt: debt,
                  branch_id: branchIdFromData,
                  gender,
                  birthday,
                  address,
                  source_id: sourceId,
                  last_hash: currentHash,
                },
              });
            }

            // Tracking Daily Activity
            await this.prisma.dailyCustomer.upsert({
               where: { date_customer_id: { date: this.parseDate(dateFrom) as Date, customer_id: id } },
               update: { branch_id: branchIdFromData, customer_name: name, phone: phone },
               create: { 
                 date: this.parseDate(dateFrom) as Date, 
                 customer_id: id, 
                 branch_id: branchIdFromData, 
                 customer_name: name, 
                 phone: phone,
                 gender: gender,
                 birthday: birthday,
                 source_id: sourceId
               }
            });

            customerIds.push(id);
          } catch (e) {
            this.addLog(`❌ [ID: ${c.CustID || c.ID}] Lỗi upsert khách hàng: ${e.message}`);
          }
        }
        start += length;
        if (dataItems.length < length) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    return customerIds;
  }

  private async syncAppointments(dateFrom: string, dateTo: string, branchId: number = 0): Promise<number[]> {
    const customerIds: number[] = [];
    let res: any = null;
    try {
      res = await this.vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
        DateFrom: dateFrom,
        BranchID: branchId.toString(),
        AppID: '0',
        StatusID: '0',
        DoctorID: '0',
        TypeApp: '1',
      });
    } catch (e) {
      this.addLog(`   ❌ [Loicansua] [SyncAppointments] Lỗi API: ${e.message}`);
      return [];
    }

    const dataItems = this.ensureArray(res);
    // this.logger.log(`  📥 [Appointment] Branch ${branchId}: Got ${dataItems.length} records.`);

    if (dataItems.length > 0) {
      for (const a of dataItems) {
        try {
          const id = parseInt(a.ID || a.ScheduleID || a.id || a.AppID);
          const customerId = parseInt(a.CustomerID || a.customer_id || a.CustID);
          if (!id) continue;
          
          await this.prisma.appointment.upsert({
            where: { id },
            update: {
              customer_id: customerId,
              customer_name: a.CustName || a.CustomerName || a.Customer_Name || '',
              phone: a.Phone || a.Mobile || a.CustPhone || '',
              branch_id: branchId || parseInt(a.BranchID || a.branch_id || a.BranchId) || undefined,
              branch_name: a.BranchName || a.Branch || '',
              service_id: parseInt(a.ServiceTreat_ID || a.ServiceID || a.Service) || 0,
              service_name: String(a.ServiceName || a.TypeName || a.Service || ''),
              employee_id: parseInt(a.DoctorID || a.EmployeeID || a.Doctor) || 0,
              employee_name: a.DoctorName || a.EmployeeName || a.Doctor || '',
              status: parseInt(a.TypeStatusID || a.Status || a.StatusID || a.State) || 0,
              appointment_date: this.parseDate(a.DateFrom || a.Date || a.AppointmentDate || a.CreatedDate || a.Created) || new Date(),
              note: a.Note || a.Content || '',
            },
            create: {
              id,
              customer_id: customerId,
              customer_name: a.CustName || a.CustomerName || a.Customer_Name || '',
              phone: a.Phone || a.Mobile || a.CustPhone || '',
              branch_id: branchId || parseInt(a.BranchID || a.branch_id || a.BranchId) || undefined,
              branch_name: a.BranchName || a.Branch || '',
              service_id: parseInt(a.ServiceTreat_ID || a.ServiceID || a.Service) || 0,
              service_name: String(a.ServiceName || a.TypeName || a.Service || ''),
              employee_id: parseInt(a.DoctorID || a.EmployeeID || a.Doctor) || 0,
              employee_name: a.DoctorName || a.EmployeeName || a.Doctor || '',
              status: parseInt(a.TypeStatusID || a.Status || a.StatusID || a.State) || 0,
              appointment_date: this.parseDate(a.DateFrom || a.Date || a.AppointmentDate || a.CreatedDate || a.Created) || new Date(),
              note: a.Note || a.Content || '',
            },
          });
          if (customerId) customerIds.push(customerId);
        } catch (e) {}
      }
    }
    return customerIds;
  }

  private async syncAllCustomerDetails(dateFrom: string, dateTo: string, ids?: number[]) {
    let customers: { id: number }[] = [];
    
    if (ids && ids.length > 0) {
      // Deduplicate IDs
      const uniqueIds = [...new Set(ids)];
      customers = uniqueIds.map(id => ({ id }));
    } else {
      // Fallback: This is what was causing the bug when running for past dates.
      // We should probably find customers who had activity in our DB for that range.
      const dFrom = this.parseDate(dateFrom);
      const dTo = this.parseDate(dateTo);
      if (!dFrom || !dTo) {
        this.addLog(`⏩ Bỏ qua bước này do ngày không hợp lệ: ${dateFrom} - ${dateTo}`);
        return;
      }

      const appointmentIds = await this.prisma.appointment.findMany({
        where: {
          appointment_date: {
            gte: new Date(new Date(dFrom).setHours(0,0,0,0)),
            lte: new Date(new Date(dTo).setHours(23,59,59,999)),
          }
        },
        select: { customer_id: true }
      });
      
      const uniqueIds = [...new Set(appointmentIds.map(a => a.customer_id).filter((id): id is number => id !== null))];
      customers = uniqueIds.map(id => ({ id }));
      
      this.addLog(`⚠️ Không có danh sách ID trực tiếp, tìm thấy ${customers.length} khách hàng từ lịch hẹn trong khoảng ${dateFrom} - ${dateTo}`);
    }

    if (customers.length === 0) {
      this.addLog('⏩ Không có khách hàng nào cần đồng bộ chi tiết trong khoảng thời gian này.');
      return;
    }

    this.addLog(`🔍 Đang đẩy ${customers.length} khách hàng vào hàng đợi đồng bộ chi tiết...`);
    
    for (let i = 0; i < customers.length; i++) {
        if (this.syncStatus.shouldStop) {
            this.addLog('🛑 Đã dừng đồng bộ chi tiết khách hàng theo yêu cầu.');
            break;
        }
        const customer = customers[i];
        
        try {
            await this.syncQueue.add('sync-job', {
                type: 'sync-customer-detail',
                data: { customerId: customer.id }
            }, {
                jobId: `manual-detail-${customer.id}-${Date.now()}`,
                removeOnComplete: true,
                attempts: 3,
            });
        } catch (e) {
            this.logger.error(`Error queuing detail for customer ${customer.id}: ${e.message}`);
        }
    }
    this.addLog('✅ Hoàn thành đẩy dữ liệu vào hàng đợi. Các Worker sẽ xử lý song song.');
  }

  private async syncMasterData(force: boolean = false): Promise<{ branches: number, services: number }> {
    const startTime = Date.now();
    const stats = { branches: 0, services: 0 };

    if (!force) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastSync = await this.prisma.crawlLog.findFirst({
        where: {
          crawl_type: 'master_sync',
          status: 'success',
          created_at: { gte: today }
        }
      });

      if (lastSync) {
        this.addLog('⏩ Bỏ qua đồng bộ Master Data (Đã đồng bộ hôm nay)');
        return { 
          branches: (lastSync as any).total_branches || 0, 
          services: (lastSync as any).total_services || 0 
        };
      }
    }

    this.addLog('📦 Đang đồng bộ Master Data (Danh mục)...');
    let result: any = {};
    try {
      result = await this.vttechApi.callApi('/api/Home/SessionData', {});
    } catch (e) {
      this.addLog(`⚠️ Cảnh báo: Không thể lấy SessionData (/api/Home/SessionData): ${e.message}. Sẽ thử các nguồn khác...`);
    }
    if (!result) {
      this.addLog('⚠️ Không lấy được SessionData');
      return stats;
    }

    // 1. Branches (Table)
    if (result.Table) {
      stats.branches = result.Table.length;
      for (const b of result.Table) {
        await this.prisma.branch.upsert({
          where: { id: parseInt(b.ID) },
          update: { name: b.Name, code: b.Code, address: b.Address, phone: b.Phone, is_active: 1 },
          create: { id: parseInt(b.ID), name: b.Name, code: b.Code, address: b.Address, phone: b.Phone, is_active: 1 },
        });
      }
      this.addLog(`  ✅ Chi nhánh: ${result.Table.length}`);
    }

    // 2. Services (Table2)
    if (result.Table2) {
      stats.services = result.Table2.length;
      for (const s of result.Table2) {
        await this.prisma.service.upsert({
          where: { id: parseInt(s.ID) },
          update: { name: s.Name, code: s.Code, price: parseFloat(s.Price || 0), group_id: parseInt(s.GroupID) || null },
          create: { id: parseInt(s.ID), name: s.Name, code: s.Code, price: parseFloat(s.Price || 0), group_id: parseInt(s.GroupID) || null },
        });
      }
      this.addLog(`  ✅ Dịch vụ: ${result.Table2.length}`);
    }

    // 3. Service Groups (Table3)
    if (result.Table3) {
      for (const g of result.Table3) {
        await this.prisma.serviceGroup.upsert({
          where: { id: parseInt(g.ID) },
          update: { name: g.Name, code: g.Code, parent_id: parseInt(g.ParentID) || null },
          create: { id: parseInt(g.ID), name: g.Name, code: g.Code, parent_id: parseInt(g.ParentID) || null },
        });
      }
      this.addLog(`  ✅ Nhóm dịch vụ: ${result.Table3.length}`);
    }

    // 4. Employees (Table4)
    if (result.Table4) {
      for (const e of result.Table4) {
        await this.prisma.employee.upsert({
          where: { id: parseInt(e.ID) },
          update: { name: e.Name, code: e.Code, phone: e.Phone, branch_id: parseInt(e.BranchID) || null, position: e.PositionName },
          create: { id: parseInt(e.ID), name: e.Name, code: e.Code, phone: e.Phone, branch_id: parseInt(e.BranchID) || null, position: e.PositionName },
        });
      }
      this.addLog(`  ✅ Nhân viên: ${result.Table4.length}`);
    }

    // 5. Users (Table5)
    if (result.Table5) {
      for (const u of result.Table5) {
        await this.prisma.user.upsert({
          where: { id: parseInt(u.ID) },
          update: { username: u.Account, full_name: u.FullName, phone: u.Phone, branch_id: parseInt(u.BranchID) || null, role: u.RoleName },
          create: { id: parseInt(u.ID), username: u.Account, full_name: u.FullName, phone: u.Phone, branch_id: parseInt(u.BranchID) || null, role: u.RoleName },
        });
      }
      this.addLog(`  ✅ Người dùng: ${result.Table5.length}`);
    }

    // 6. Cities (Table6)
    if (result.Table6) {
      for (const c of result.Table6) {
        await this.prisma.city.upsert({
          where: { id: parseInt(c.ID) },
          update: { name: c.Name, code: c.Code },
          create: { id: parseInt(c.ID), name: c.Name, code: c.Code },
        });
      }
      this.addLog(`  ✅ Tỉnh/Thành: ${result.Table6.length}`);
    }

    // 7. Districts (Table7)
    if (result.Table7) {
      for (const d of result.Table7) {
        await this.prisma.district.upsert({
          where: { id: parseInt(d.ID) },
          update: { name: d.Name, city_id: parseInt(d.CityID) || null },
          create: { id: parseInt(d.ID), name: d.Name, city_id: parseInt(d.CityID) || null },
        });
      }
      this.addLog(`  ✅ Quận/Huyện: ${result.Table7.length}`);
    }

    // 8. Wards (Table9)
    if (result.Table9) {
      for (const w of result.Table9) {
        await this.prisma.ward.upsert({
          where: { id: parseInt(w.ID) },
          update: { name: w.Name, district_id: parseInt(w.DistrictID) || null },
          create: { id: parseInt(w.ID), name: w.Name, district_id: parseInt(w.DistrictID) || null },
        });
      }
      this.addLog(`  ✅ Phường/Xã: ${result.Table9.length}`);
    }

    // 9. Customer Sources (Table10)
    if (result.Table10) {
      for (const s of result.Table10) {
        await this.prisma.customerSource.upsert({
          where: { id: parseInt(s.ID) },
          update: { name: s.Name, code: s.Code },
          create: { id: parseInt(s.ID), name: s.Name, code: s.Code },
        });
      }
      this.addLog(`  ✅ Nguồn khách hàng: ${result.Table10.length}`);
    }

    // Sync Memberships from Initialize
    const initData = await this.vttechApi.callHandler('/Customer/ListCustomer/', 'Initialize', {});
    if (initData && initData.Membership) {
      for (const m of initData.Membership) {
        await this.prisma.membership.upsert({
          where: { id: parseInt(m.ID) },
          update: { name: m.Name, code: m.Code, discount_percent: parseFloat(m.Discount || 0), min_spending: parseFloat(m.MinSpending || 0) },
          create: { id: parseInt(m.ID), name: m.Name, code: m.Code, discount_percent: parseFloat(m.Discount || 0), min_spending: parseFloat(m.MinSpending || 0) },
        });
      }
      this.addLog(`  ✅ Hạng thành viên: ${initData.Membership.length}`);
    }

    const duration = (Date.now() - startTime) / 1000;

    // Log successful master sync
    await this.prisma.crawlLog.create({
      data: {
        crawl_date: new Date(),
        crawl_type: 'master_sync',
        status: 'success',
        records_count: stats.branches + stats.services,
        total_branches: stats.branches,
        total_services: stats.services,
        duration_seconds: duration
      }
    });

    return stats;
  }

  private async syncCustomerStatus(customerId: number) {
    try {
      const res = await this.vttechApi.callHandler('/Customer/StatusList/', 'LoadataStatus', { 
        CustomerID: customerId, 
        id: 0, 
        limit: 100, 
        beginID: 0, 
        Type: 0, 
        TypeParent: 0 
      });
      const items = this.ensureArray(res?.Data || res?.Table1);
      for (const item of items) {
        const hId = parseInt(item.ID);
        if (!hId) continue;
        await this.prisma.customerStatusHistory.upsert({
          where: { customer_id_history_id: { customer_id: customerId, history_id: hId } },
          update: {
            content: item.Content,
            master_status_name: item.MasterStatusName,
            detail_status_name: item.DetailStatusName,
            color_code: item.ColorCode,
            employee_name: item.Employee,
            created_at: this.parseDate(item.Created),
          },
          create: {
            customer_id: customerId,
            history_id: hId,
            content: item.Content,
            master_status_name: item.MasterStatusName,
            detail_status_name: item.DetailStatusName,
            color_code: item.ColorCode,
            employee_name: item.Employee,
            created_at: this.parseDate(item.Created),
          }
        });
      }
      if (items.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử trạng thái`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerStatus: ${e.message}`);
    }
  }

  private async syncCustomerGeneralInfo(customerId: number) {
    try {
      const res = await this.vttechApi.callHandler('/Customer/GeneralInfo/', 'LoadData', { CustomerID: customerId });
      if (res && res.Table && res.Table[0]) {
        const info = res.Table[0];
        const name = info.CustName || info.FullName || info.Name || 'Unknown';
        await this.prisma.customer.upsert({
          where: { id: customerId },
          update: {
            name,
            gender: parseInt(info.Gender_ID) || null,
            branch_id: parseInt(info.BranchID) || null,
            birthday: this.parseDate(info.Birthday),
            phone: info.Phone,
            address: info.Address,
          },
          create: {
            id: customerId,
            name,
            gender: parseInt(info.Gender_ID) || null,
            branch_id: parseInt(info.BranchID) || null,
            birthday: this.parseDate(info.Birthday),
            phone: info.Phone,
            address: info.Address,
          }
        });
        this.addLog(`   ✅ [ID: ${customerId}] Đã cập nhật thông tin cơ bản (Giới tính, Ngày sinh, Địa chỉ)`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerGeneralInfo: ${e.message}`);
    }
  }

  private async syncCustomerCards(customerId: number) {
    try {
      const res = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Card/', 'LoadataCard', { 
        CustomerID: customerId, 
        id: 0, 
        limit: 100, 
        beginID: 0 
      });
      const cards = this.ensureArray(res?.Table);
      const allLogs = this.ensureArray(res?.Table1);
      
      for (const c of cards) {
        const cardId = parseInt(c.ID);
        if (!cardId) continue;
        const customerCard = await this.prisma.customerCard.upsert({
          where: { customer_id_card_id: { customer_id: customerId, card_id: cardId } },
          update: {
            code: c.Code,
            card_name: c.CardName,
            price_root: parseFloat(c.PriceRoot) || 0,
            price_discounted: parseFloat(c.PriceDiscounted) || 0,
            price_use: parseFloat(c.PriceUse) || 0,
            amount_using: parseFloat(c.AmountUsing) || 0,
            total_paid: parseFloat(c.TotalPaid) || 0,
            quantity: parseInt(c.Quantity) || 1,
            note: c.Note,
            expired_date: this.parseDate(c.ExpiredDate),
            created_at: this.parseDate(c.Created),
          },
          create: {
            customer_id: customerId,
            card_id: cardId,
            code: c.Code,
            card_name: c.CardName,
            price_root: parseFloat(c.PriceRoot) || 0,
            price_discounted: parseFloat(c.PriceDiscounted) || 0,
            price_use: parseFloat(c.PriceUse) || 0,
            amount_using: parseFloat(c.AmountUsing) || 0,
            total_paid: parseFloat(c.TotalPaid) || 0,
            quantity: parseInt(c.Quantity) || 1,
            note: c.Note,
            expired_date: this.parseDate(c.ExpiredDate),
            created_at: this.parseDate(c.Created),
          }
        });

        // Sync Usage Logs for this card
        const cardLogs = allLogs.filter(l => parseInt(l.CardID) === cardId);
        for (const l of cardLogs) {
           // No unique ID for logs, use composite check
           const logDate = this.parseDate(l.Created);
           const amount = parseFloat(l.Amount) || 0;
           const serviceId = parseInt(l.ServiceID) || null;
           
           const existingLog = await this.prisma.customerCardLog.findFirst({
              where: {
                card_id: customerCard.id,
                amount: amount,
                service_id: serviceId,
                created_at: logDate
              }
           });

           if (!existingLog) {
              await this.prisma.customerCardLog.create({
                data: {
                  card_id: customerCard.id,
                  service_id: serviceId,
                  amount: amount,
                  is_plus: parseInt(l.IsPlus) || 0,
                  reason_name: l.ReasonName,
                  note: l.Note,
                  created_at: logDate
                }
              });
           }
        }
      }
      if (cards.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${cards.length} Thẻ tài khoản & Lịch sử sử dụng`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerCards: ${e.message}`);
    }
  }

  private async syncCustomerMedicine(customerId: number, branchId: number = 0) {
    try {
      const res = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Medicine/', 'LoadataPrescriptionMedicine', { 
        CustomerID: customerId, 
        id: 0, 
        limit: 100, 
        beginID: 0 
      });
      const items = this.ensureArray(res?.Table || res);
      for (const item of items) {
        const mId = parseInt(item.ID);
        if (!mId) continue;
        await this.prisma.customerPrescription.upsert({
          where: { customer_id_prescription_id: { customer_id: customerId, prescription_id: mId } },
          update: {
            medicine_name: item.Name,
            quantity: parseInt(item.Quantity) || 1,
            unit_name: item.UnitName || '',
            dosage: item.Dosage || '',
            branch_id: branchId || undefined,
            created_at: this.parseDate(item.Created),
          },
          create: {
            customer_id: customerId,
            prescription_id: mId,
            medicine_name: item.Name,
            quantity: parseInt(item.Quantity) || 1,
            unit_name: item.UnitName || '',
            dosage: item.Dosage || '',
            branch_id: branchId || undefined,
            created_at: this.parseDate(item.Created),
          }
        });
      }
      if (items.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Đơn thuốc/Sản phẩm`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerMedicine: ${e.message}`);
    }
  }

  private async syncCustomerImages(customerId: number) {
    try {
      const foldersRes = await this.vttechApi.callHandler('/Customer/CustomerImage/', 'LoadAllFolder', { CustomerID: customerId });
      const folders = this.ensureArray(foldersRes);
      for (const f of folders) {
        const folderId = String(f.ID || f.FolderID || f.FolderName);
        const folder = await this.prisma.customerImageFolder.upsert({
          where: { customer_id_folder_id: { customer_id: customerId, folder_id: folderId } },
          update: { folder_name: f.FolderName, created_at: this.parseDate(f.Created) },
          create: { customer_id: customerId, folder_id: folderId, folder_name: f.FolderName, created_at: this.parseDate(f.Created) }
        });
        const imagesRes = await this.vttechApi.callHandler('/Customer/CustomerImage/', 'LoadImageByFolder', { 
          CustomerID: customerId, 
          currentFolderID: folderId,
          idetail: 0,
          type: 0
        });
        const images = this.ensureArray(imagesRes);
        for (const img of images) {
          if (!img.CloudID) continue;
          const existing = await this.prisma.customerImage.findFirst({ where: { folder_id: folder.id, cloud_id: img.CloudID } });
          if (!existing) {
            await this.prisma.customerImage.create({
              data: {
                folder_id: folder.id,
                real_name: img.RealName,
                feature_image: img.FeatureImage,
                cloud_id: img.CloudID,
                created_at: this.parseDate(img.Created),
              }
            });
          }
        }
      }
      if (folders.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${folders.length} Thư mục ảnh`);
    } catch (error) {
       this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerImages: ${error.message}`);
    }
  }

  private async syncCustomerPayments(customerId: number, branchId: number = 0): Promise<number> {
    let total = 0;
    try {
      // 1. Service Payments
      const servicePayments = await this.vttechApi.callHandler('/Customer/Payment/PaymentList/PaymentList_Service/', 'LoadataPayment', { CustomerID: customerId });
      const sItems = this.ensureArray(servicePayments);
      for (const p of sItems) {
        const pId = parseInt(p.ID || p.id);
        if (!pId) continue;
        await this.prisma.customerPayment.upsert({
          where: { customer_id_payment_id: { customer_id: customerId, payment_id: pId } },
          update: { 
            amount: this.parseNumber(p.Amount || 0), 
            payment_date: this.parseDate(p.Date || p.Created), 
            branch_id: branchId || parseInt(p.BranchID) || undefined,
            payment_method: p.MethodName || '', 
            note: p.Note || p.Content || '',
            signature_data: p.SignatureData || null
          },
          create: { 
            customer_id: customerId,
            payment_id: pId, 
            amount: this.parseNumber(p.Amount || 0), 
            branch_id: branchId || parseInt(p.BranchID) || undefined,
            payment_date: this.parseDate(p.Date || p.Created), 
            payment_method: p.MethodName || '', 
            note: p.Note || p.Content || '',
            signature_data: p.SignatureData || null
          }
        });
        total++;
      }

      // 2. Card Payments
      const cardPayments = await this.vttechApi.callHandler('/Customer/Payment/PaymentList/PaymentList_Card/', 'LoadataPaymentCard', { 
        CustomerID: customerId, 
        id: 0, 
        limit: 100, 
        beginID: 0 
      });
      const cItems = this.ensureArray(cardPayments);
      for (const p of cItems) {
        const pId = parseInt(p.ID || p.id);
        if (!pId) continue;
        await this.prisma.customerPayment.upsert({
          where: { customer_id_payment_id: { customer_id: customerId, payment_id: pId } },
          update: {
            amount: parseFloat(p.Amount || 0) || 0,
            payment_date: this.parseDate(p.Date || p.Created),
            payment_method: p.MethodName || '',
            note: p.Note || p.Content || '',
            signature_data: p.SignatureData || null
          },
          create: {
            customer_id: customerId,
            payment_id: pId,
            amount: parseFloat(p.Amount || 0) || 0,
            payment_date: this.parseDate(p.Date || p.Created),
            payment_method: p.MethodName || '',
            note: p.Note || p.Content || '',
            signature_data: p.SignatureData || null
          }
        });
        total++;
      }
      if (total > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${total} Lịch sử thanh toán (Dịch vụ & Thẻ)`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerPayments: ${e.message}`);
    }
    return total;
  }

  private async syncCustomerSchedules(customerId: number, branchId: number = 0): Promise<number> {
    let total = 0;
    try {
      const res = await this.vttechApi.callHandler('/Customer/ScheduleList_Schedule/', 'Loadata', { CustomerID: customerId, IsCancel: 1 });
      const items = this.ensureArray(res);
      for (const item of items) {
        const sId = parseInt(item.ID);
        if (!sId) continue;

        await this.prisma.appointment.upsert({
          where: { id: sId },
          update: {
            customer_id: customerId,
            appointment_date: this.parseDate(item.Date_From),
            note: item.Content || '',
            status: item.IsCancel === 0 ? 1 : 2,
            branch_id: branchId || parseInt(item.BranchID) || null,
            branch_name: item.Branch || '',
            employee_name: item.DoctorName || '',
          },
          create: {
            id: sId,
            customer_id: customerId,
            appointment_date: this.parseDate(item.Date_From),
            note: item.Content || '',
            status: item.IsCancel === 0 ? 1 : 2,
            branch_id: branchId || parseInt(item.BranchID) || null,
            branch_name: item.Branch || '',
            employee_name: item.DoctorName || '',
          }
        });
        total++;
      }
      if (total > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${total} Lịch hẹn từ ScheduleList`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerSchedules: ${e.message}`);
    }
    return total;
  }

  private async syncSingleCustomerDetail(customerId: number, parentTaskId?: number, syncDate?: string): Promise<{ payments: number, treatments: number, services: number, appointments: number }> {
    this.logger.log(`🔍 [ID: ${customerId}] 🚀 Bắt đầu Full Sync chi tiết. SyncDate: ${syncDate || 'NULL'}`);
    const stats = { payments: 0, treatments: 0, services: 0, appointments: 0 };

    try {
      // 1. Nhóm khởi tạo & cơ bản (Phải có trước)
      await this.syncCustomerGeneralInfo(customerId);
      
      const customer = await this.prisma.customer.findUnique({ 
        where: { id: customerId }, 
        select: { branch_id: true, phone: true } 
      });
      const branchId = customer?.branch_id || 0;

      // 2. Các nhóm dữ liệu độc lập (Chạy song song)
      await Promise.all([
        // Nhóm Tài chính
        (async () => {
          try {
            const payInfo = await this.vttechApi.callHandler('/Customer/MainCustomer/', 'LoadPaymentInfo', { CustomerID: customerId });
            const payInfoItems = this.ensureArray(payInfo);
            if (payInfoItems.length > 0) {
              const info = payInfoItems[0];
              const paid = this.parseNumber(info.PAID || info.Paid);
              const discounted = this.parseNumber(info.PRICE_DISCOUNTED || info.PriceDiscounted);
              await this.prisma.customer.update({
                where: { id: customerId },
                data: { total_spent: paid, total_debt: discounted - paid }
              });
            }
          } catch (e) { this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadPaymentInfo: ${e.message}`); }
          stats.payments = await this.syncCustomerPayments(customerId, branchId);
        })(),

        // Nhóm Dịch vụ & Điều trị
        (async () => {
          try {
            const services = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab', { CustomerID: customerId });
            const items = this.ensureArray(services);
            for (const s of items) {
              const sDate = this.parseDate(s.Created || s.Date);
              const isToday = syncDate && sDate && sDate.toISOString().split('T')[0] === syncDate;
              if (isToday) stats.services++;
              const sId = parseInt(s.ID || s.id);
              if (!sId) continue;
              await this.prisma.customerServiceTab.upsert({
                where: { customer_id_service_id: { customer_id: customerId, service_id: sId } },
                update: { 
                  service_name: s.ServiceName || '', quantity: parseInt(s.Quantity) || 1, 
                  price: this.parseNumber(s.Price || s.Price_Root), total: this.parseNumber(s.Total || s.Amount), 
                  branch_id: branchId || parseInt(s.BranchID) || null, status: s.StatusName || '',
                  created_at: this.parseDate(s.Created || s.Date)
                },
                create: { 
                  customer_id: customerId, service_id: sId, service_name: s.ServiceName || '', 
                  quantity: parseInt(s.Quantity) || 1, price: this.parseNumber(s.Price || s.Price_Root), 
                  total: this.parseNumber(s.Total || s.Amount), branch_id: branchId || parseInt(s.BranchID) || null,
                  status: s.StatusName || '', created_at: this.parseDate(s.Created || s.Date)
                }
              });
            }
          } catch (e) { this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab: ${e.message}`); }
          
          try {
            const treatments = await this.vttechApi.callHandler('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadataTreatment', { 
              CustomerID: customerId, limit: 100
            });
            const items = this.ensureArray(treatments);
            for (const t of items) {
              const tDate = this.parseDate(t.Date || t.Created);
              const tDateStr = tDate ? tDate.toISOString().split('T')[0] : null;
              const isToday = syncDate && tDateStr === syncDate;
              
              if (isToday) {
                stats.treatments++;
                // this.logger.debug(`[ID: ${customerId}] Found daily treatment: ${tDateStr} (Matches ${syncDate})`);
              }
              const tId = parseInt(t.ID || t.id);
              if (!tId) continue;
              await this.prisma.treatment.upsert({
                where: { id: tId },
                update: { 
                  customer_id: customerId, service_name: String(t.ServiceName || t.Service || ''), 
                  amount: this.parseNumber(t.Amount || t.TotalAmount),
                  treatment_date: this.parseDate(t.Date || t.Created) || new Date()
                },
                create: { 
                  id: tId, customer_id: customerId, service_name: String(t.ServiceName || t.Service || ''), 
                  amount: this.parseNumber(t.Amount || t.TotalAmount),
                  treatment_date: this.parseDate(t.Date || t.Created) || new Date()
                }
              });
            }
          } catch (e) { this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTreatment: ${e.message}`); }
        })(),

        // Nhóm Tương tác & Khác
        (async () => {
          stats.appointments = await this.syncCustomerSchedules(customerId, branchId);
          await Promise.all([
            this.syncCustomerCards(customerId),
            this.syncCustomerAnamnesis(customerId),
            this.syncCustomerStatus(customerId),
            this.syncCustomerTickets(customerId, branchId),
            this.syncCustomerSms(customerId, branchId),
            customer?.phone ? this.syncCustomerVttechCalls(customerId, customer.phone) : Promise.resolve()
          ]);
        })()
      ]);

    } catch (globalError) {
      this.logger.error(`[ID: ${customerId}] Critical error in syncSingleCustomerDetail: ${globalError.message}`);
    } finally {
      // Đảm bảo luôn cập nhật Task cha để không bị kẹt 99%
      if (parentTaskId) {
        try {
          // Increment counts only for items that matched the sync date
          // revenue_total is handled at HEADER level for accuracy
          const updatedTask = (await this.prisma.syncTask.update({
            where: { id: parentTaskId },
            data: {
              services_count: { increment: stats.services },
              treatments_count: { increment: stats.treatments },
              appointments_count: { increment: stats.appointments },
              completed_details: { increment: 1 },
              updated_at: new Date(),
            } as any
          })) as any;

          if (updatedTask.completed_details >= updatedTask.total_details && updatedTask.status === 'PROCESSING') {
            await this.prisma.syncTask.update({
               where: { id: parentTaskId },
               data: { status: 'SUCCESS' }
            });
            this.logger.log(`[TASK ${parentTaskId}] ✅ Hoàn tất 100% (${updatedTask.total_details} khách hàng)`);
          }
        } catch (e) {
          this.logger.warn(`[TASK ${parentTaskId}] Lỗi cập nhật tiến độ: ${e.message}`);
        }
      }
    }
    
    this.addLog(`✅ [ID: ${customerId}] Kết thúc Full Sync.`);
    return stats;
  }

  private async syncCustomerAnamnesis(customerId: number) {
    try {
      const res = await this.vttechApi.callHandler('/Customer/Anamnesis/CustomerAnamnesisList/', 'LoadataPatientHistory', { CustomerID: customerId });
      const items = this.ensureArray(res);
      for (const item of items) {
        const id = parseInt(item.ID);
        if (!id) continue;
        await this.prisma.customerAnamnesis.upsert({
          where: { id: id },
          update: {
            content: item.Content || item.Name,
            note: item.Note,
            created_at: this.parseDate(item.Created)
          },
          create: {
            id: id,
            customer_id: customerId,
            content: item.Content || item.Name,
            note: item.Note,
            created_at: this.parseDate(item.Created)
          }
        });
      }
      if (items.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Tiền sử (Anamnesis)`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerAnamnesis: ${e.message}`);
    }
  }

  private async syncCustomerVttechCalls(customerId: number, phone: string) {
    try {
      if (!phone || phone.length < 9) return;
      
      // VTTech doesn't store Call History directly in its DB for this endpoint (it returns an HTML view that queries the PBX API live).
      // Since we already sync PBX CDRs into `pbx_call_records` via PbxSyncService, we just need to map them locally.
      const pbxCalls = await this.prisma.pbxCallRecord.findMany({
        where: {
          OR: [
            { destination_number: { contains: phone } },
            { outbound_caller_id_number: { contains: phone } },
            { caller_id_number: { contains: phone } }
          ]
        },
        orderBy: { start_time: 'desc' }
      });

      for (const call of pbxCalls) {
        if (!call.uuid) continue;
        await this.prisma.customerCall.upsert({
          where: { call_id: call.uuid },
          update: {
            duration: call.duration,
            link_audio: call.record_path,
            employee_name: call.caller_id_number || call.outbound_caller_id_number,
            created_at: call.start_time
          },
          create: {
            customer_id: customerId,
            call_id: call.uuid,
            phone: phone,
            duration: call.duration,
            link_audio: call.record_path,
            content: call.direction, // Inbound/Outbound
            employee_name: call.caller_id_number || call.outbound_caller_id_number,
            created_at: call.start_time
          }
        });
      }
      if (pbxCalls.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã map ${pbxCalls.length} Cuộc gọi PBX vào hồ sơ Khách hàng`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerVttechCalls: ${e.message}`);
    }
  }

  private async syncCustomerTickets(customerId: number, branchId: number = 0) {
    try {
      // Phỏng đoán handler cho Ticket khách hàng
      const res = await this.vttechApi.callHandler('/Marketing/TicketList/', 'Loadata', { CustomerID: customerId, Limit: 100, BeginID: 0 });
      const items = this.ensureArray(res?.Data || res?.Table || res);
      for (const item of items) {
        const tId = parseInt(item.ID);
        if (!tId) continue;
        await this.prisma.customerTicket.upsert({
          where: { customer_id_ticket_id: { customer_id: customerId, ticket_id: tId } },
          update: {
            content: item.Content || item.Note,
            status_name: item.StatusName,
            employee_name: item.EmployeeName,
            branch_id: branchId || undefined,
            created_at: this.parseDate(item.Created),
          },
          create: {
            customer_id: customerId,
            ticket_id: tId,
            branch_id: branchId || undefined,
            content: item.Content || item.Note,
            status_name: item.StatusName,
            employee_name: item.EmployeeName,
            created_at: this.parseDate(item.Created),
          }
        });
      }
      if (items.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Ticket Marketing`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerTickets: ${e.message}`);
    }
  }

  private async syncCustomerSms(customerId: number, branchId: number = 0) {
    try {
      // SMS thường nằm chung trong HistoryList_Care với Type cụ thể, hoặc API SMS riêng
      const res = await this.vttechApi.callHandler('/Marketing/Sms/History/', 'Loadata', { CustomerID: customerId, Limit: 100, BeginID: 0 });
      const items = this.ensureArray(res?.Data || res?.Table || res);
      
      for (const item of items) {
        const sId = parseInt(item.ID);
        if (!sId) continue;
        await this.prisma.customerSms.upsert({
          where: { customer_id_sms_id: { customer_id: customerId, sms_id: sId } },
          update: {
            phone: item.Phone,
            content: item.Content,
            status_name: item.StatusName,
            branch_id: branchId || undefined,
            created_at: this.parseDate(item.Created),
          },
          create: {
            customer_id: customerId,
            sms_id: sId,
            phone: item.Phone,
            content: item.Content,
            status_name: item.StatusName,
            branch_id: branchId || undefined,
            created_at: this.parseDate(item.Created),
          }
        });
      }
      if (items.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Tin nhắn SMS`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerSms: ${e.message}`);
    }
  }

  async getLogs(limit: number = 100) {
    return this.prisma.crawlLog.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
    });
  }

  // --- Queue Optimized Methods ---

  private generateHash(data: any): string {
    return CryptoJS.MD5(JSON.stringify(data)).toString();
  }

  async processQueuedCustomerDetail(customerId: number, parentTaskId?: number) {
    this.logger.log(`Worker processing customer detail: ${customerId}`);
    try {
      await this.vttechApi.login();
      await this.vttechApi.getXsrfToken();
      // syncSingleCustomerDetail now handles SyncTask update internally
      return await this.syncSingleCustomerDetail(customerId, parentTaskId);
    } catch (error) {
      this.logger.error(`Error in processQueuedCustomerDetail: ${error.message}`);
      throw error;
    }
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseNumber(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    // Xử lý chuỗi có dấu phẩy (thousand separator) hoặc dấu chấm
    const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }

  private async ensureBranchExists(id: number | null) {
    if (!id || this.knownBranchIds.has(id)) return;
    
    try {
      await this.prisma.branch.upsert({
        where: { id },
        update: {},
        create: { id, name: `Chi nhánh #${id}`, code: `BR${id}` }
      });
      this.knownBranchIds.add(id);
    } catch (e) {
      this.logger.error(`Failed to ensureBranchExists for ID ${id}: ${e.message}`);
    }
  }

  private async ensureSourceExists(id: number | null) {
    if (!id || this.knownSourceIds.has(id)) return;
    
    try {
      await this.prisma.customerSource.upsert({
        where: { id },
        update: {},
        create: { id, name: `Nguồn #${id}`, code: `SRC${id}` }
      });
      this.knownSourceIds.add(id);
    } catch (e) {
      this.logger.error(`Failed to ensureSourceExists for ID ${id}: ${e.message}`);
    }
  }

  private async ensureMembershipExists(id: number | null) {
    if (!id || this.knownMembershipIds.has(id)) return;
    
    try {
      await this.prisma.membership.upsert({
        where: { id },
        update: {},
        create: { id, name: `Hạng #${id}`, code: `MEM${id}` }
      });
      this.knownMembershipIds.add(id);
    } catch (e) {
      this.logger.error(`Failed to ensureMembershipExists for ID ${id}: ${e.message}`);
    }
  }

  private mapRevenueItem(item: any, branchId: number, fallbackDate?: string) {
    // Logic khớp Dashboard 100%:
    // amount -> Lưu trường Amount (Tiền mặt thực thu - Doanh thu)
    // paid -> Lưu trường Paid (Tổng tiền đóng cho item - Bao gồm cọc)
    // is_new -> Tạm dùng để lưu PriceDiscounted (Tổng giá trị item - Doanh số)
    const amount = this.parseNumber(item.Amount || 0);
    const paid = this.parseNumber(item.Paid || 0);
    const price = this.parseNumber(item.PriceDiscounted || 0);

    const syncDateValue = item.Date_Payment || item.PaymentDate || item.ChooseDate || item.Date || item.Created || item.DateCreated || fallbackDate;

    return {
      branch_id: branchId,
      branch_name: String(item.BranchName || item.Branch || ""),
      customer_id: parseInt(String(item.CustomerID || item.CustID || item.ID)) || 0,
      customer_name: String(item.CustomerName || item.CustName || item.FullName || "N/A"),
      customer_code: String(item.CustomerCode || item.CustCode || item.Code || ""),
      phone: String(item.Phone || item.Mobile || item.CustPhone || ""),
      service_id: parseInt(String(item.ServiceID || item.Service || item.Service_ID)) || 0,
      service_name: String(item.ServiceName || item.Service || item.Service_Name || ""),
      category_id: parseInt(String(item.ServiceCat || item.CategoryID)) || 0,
      category_name: String(item.ServiceCatName || item.CatName || ""),
      amount: amount,
      paid: paid,
      is_new: price, // Lưu Doanh số vào đây tạm
      doc_code: String(item.TabID || item.DocCode || ""),
      source_id: parseInt(String(item.Source || item.SourceID)) || 0,
      type: parseInt(String(item.Type || item.TypeID)) || 1, // Mặc định 1 nếu thiếu
      payment_method: parseInt(String(item.PaymentMethod || item.MethodID)) || 0,
      date: this.parseDate(syncDateValue) || new Date(),
      created_at: this.parseDate(item.Created || item.DateCreated || item.Date || new Date()) || new Date(),
    };
  }

  async processQueuedRevenueDay(date: string, branchId: number) {
    this.logger.log(`Worker processing revenue day: ${date}, branch: ${branchId}`);
    try {
      await this.vttechApi.login();
      await this.vttechApi.getXsrfToken();
      
      const res = await this.vttechApi.getRevenueByBranch(date, date, branchId);
      const table = this.ensureArray(res);
      // Sử dụng Map với key kết hợp để tránh mất dữ liệu khi 1 Tab có nhiều dịch vụ
      const uniqueItemsMap = new Map<string, any>();
      table.forEach((item: any, idx: number) => {
        const baseId = parseInt(item.ID || item.id || item.PaymentID || item.OrderID || item.TabID) || 0;
        const sId = parseInt(item.ServiceID || item.Service || item.Service_ID) || 0;
        // Key kết hợp: BaseID + ServiceID + Index (để tuyệt đối không trùng)
        const key = `${baseId}_${sId}_${idx}`;
        uniqueItemsMap.set(key, item);
      });

      for (const [key, item] of uniqueItemsMap.entries()) {
        const currentHash = this.generateHash(item);
        
        // Tạo một ID số duy nhất cho DB (Int)
        // Nếu baseId quá lớn, chúng ta sẽ để DB tự sinh ID và quản lý qua hash
        const baseId = parseInt(key.split('_')[0]);
        const idx = parseInt(key.split('_')[2]);
        
        // Cố gắng tạo tId ổn định để upsert, nếu không dùng hash check
        let tId: number | undefined = undefined;
        if (baseId > 0 && baseId < 2000000) {
            tId = baseId * 100 + (idx % 100); 
        }

        const mapped = this.mapRevenueItem(item, branchId, date);

        if (tId) {
            await this.prisma.revenueTransaction.upsert({
                where: { id: tId },
                update: { ...mapped, last_hash: currentHash },
                create: { ...mapped, id: tId, last_hash: currentHash }
            });
        } else {
            // Fallback: Tìm theo hash hoặc tạo mới
            const existing = await this.prisma.revenueTransaction.findFirst({
                where: { branch_id: branchId, customer_id: mapped.customer_id, last_hash: currentHash }
            });
            if (!existing) {
                await this.prisma.revenueTransaction.create({
                    data: { ...mapped, last_hash: currentHash, created_at: new Date() }
                });
            }
        }
      }
    } catch (error) {
      const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      this.logger.error(`Error in processQueuedRevenueDay: ${errorMsg}`);
      throw error;
    }
  }

  // --- Large Data Sync (Strategy v2) ---

  async seedSyncTasks(startDateStr: string, endDateStr: string) {
    const start = this.parseDate(startDateStr);
    const end = this.parseDate(endDateStr);
    if (!start || !end) throw new Error('Ngày không hợp lệ');

    const branches = await this.prisma.branch.findMany({ where: { is_active: 1 } });
    this.addLog(`🌱 Đang khởi tạo SyncTasks cho ${branches.length} chi nhánh từ ${startDateStr} đến ${endDateStr}...`);

    let currentDay = new Date(start);
    let createdCount = 0;
    let skippedCount = 0;

    const types = ['HEADER']; // Bắt đầu với HEADER trước

    while (currentDay <= end) {
      const date = new Date(currentDay);
      for (const branch of branches) {
        for (const type of types) {
          try {
            await this.prisma.syncTask.upsert({
              where: {
                date_branch_id_type: {
                  date: date,
                  branch_id: branch.id,
                  type: type,
                },
              },
              update: {}, 
              create: {
                date: date,
                branch_id: branch.id,
                branch_name: branch.name,
                type: type,
                status: 'PENDING',
              },
            });
            createdCount++;
          } catch (e) {
            skippedCount++;
          }
        }
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }

    this.addLog(`✅ Đã khởi tạo xong: ${createdCount} task mới, ${skippedCount} bản ghi đã tồn tại.`);
    return { created: createdCount, skipped: skippedCount };
  }

  async pushPendingTasksToQueue(limit: number = 1000) {
    const tasks = await this.prisma.syncTask.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'FAILED', retry_count: { lt: 5 } }
        ]
      },
      take: limit,
      orderBy: [
        { date: 'asc' },
        { branch_id: 'asc' }
      ]
    });

    this.addLog(`🚀 Đang đẩy ${tasks.length} task vào BullMQ...`);

    for (const task of tasks) {
      await this.syncQueue.add('sync-job', {
        type: 'sync-task',
        data: { taskId: task.id }
      }, {
        jobId: `sync-task-${task.id}`,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      });
      
      await this.prisma.syncTask.update({
        where: { id: task.id },
        data: { status: 'PROCESSING', last_run_at: new Date() }
      });
    }

    return { pushed: tasks.length };
  }

  async processQueuedSyncTask(taskId: number) {
    const task = await this.prisma.syncTask.findUnique({ where: { id: taskId } });
    if (!task) return;

    this.logger.log(`[TASK ${taskId}] Processing ${task.type} for branch ${task.branch_id} on ${task.date.toISOString().split('T')[0]}`);

    try {
      await this.vttechApi.login();
      await this.vttechApi.getXsrfToken();

      const dateStr = task.date.toISOString().split('T')[0];
      let totalRecords = 0;

      if (task.type === 'HEADER') {
        const typesToSync = [5, 2, 3]; // RegDate, RevenueDate, ActivityDate
        const allFoundCustomerIds = new Set<number>();
        let customersFound = 0;

        for (const type of typesToSync) {
          const ids = await this.syncCustomers(dateStr, dateStr, type, task.branch_id);
          ids.forEach(id => {
            allFoundCustomerIds.add(id);
          });
          customersFound += ids.length;
          await this.sleep(500); // Small gap between sub-types
        }

        // Also sync Appointments
        const appointmentIds = await this.syncAppointments(dateStr, dateStr, task.branch_id);
        appointmentIds.forEach(id => allFoundCustomerIds.add(id));
        const appointmentsCount = appointmentIds.length;
        totalRecords += customersFound + appointmentsCount;

        // Perform Revenue/Sales Sync for this day/branch
        let daySales = 0;
        let dayRevenue = 0;
        try {
          const res = await this.vttechApi.getRevenueByBranch(dateStr, dateStr, task.branch_id);
          const revItems = this.ensureArray(res);
          revItems.forEach(async (item: any, idx: number) => {
            const mapped = this.mapRevenueItem(item, task.branch_id, dateStr);
            daySales += mapped.amount;
            dayRevenue += mapped.paid;
            
            const baseId = parseInt(item.ID || item.id || item.PaymentID || item.OrderID || item.TabID) || 0;
            const currentHash = this.generateHash(item);
            
            let tId: number | undefined = undefined;
            if (baseId > 0 && baseId < 2000000) {
                tId = baseId * 100 + (idx % 100); 
            }

            if (tId) {
               await this.prisma.revenueTransaction.upsert({
                 where: { id: tId },
                 update: { ...mapped, last_hash: currentHash },
                 create: { ...mapped, id: tId, last_hash: currentHash }
               });
            } else {
               const existing = await this.prisma.revenueTransaction.findFirst({
                 where: { branch_id: task.branch_id, last_hash: currentHash }
               });
               if (!existing) {
                 await this.prisma.revenueTransaction.create({
                   data: { ...mapped, last_hash: currentHash, created_at: new Date() }
                 });
               }
            }
          });
          totalRecords += revItems.length;
        } catch (e) {
          this.logger.error(`[TASK ${taskId}] Error syncing revenue: ${e.message}`);
        }

        // Push all found customers to worker queue for FULL DETAIL sync
        if (allFoundCustomerIds.size > 0) {
          this.logger.log(`[TASK ${taskId}] Pushing ${allFoundCustomerIds.size} customers to Detail Sync queue`);
          for (const cId of allFoundCustomerIds) {
            await this.syncQueue.add('sync-job', {
              type: 'sync-customer-detail',
              data: { customerId: cId, parentTaskId: taskId }
            }, {
              jobId: `detail-${cId}`,
              removeOnComplete: true,
              attempts: 3,
              priority: 5,
              backoff: { type: 'exponential', delay: 10000 },
            });
          }
        }

        // Update task with header findings (Discovery done)
        // Note: status remains PROCESSING until all detail jobs finish
        await this.prisma.syncTask.update({
          where: { id: taskId },
          data: {
            status: allFoundCustomerIds.size > 0 ? 'PROCESSING' : 'SUCCESS',
            records_count: totalRecords,
            customers_count: allFoundCustomerIds.size,
            appointments_count: appointmentsCount,
            sales_total: daySales,
            revenue_total: dayRevenue,
            total_details: allFoundCustomerIds.size,
            completed_details: 0,
            error_message: null,
            updated_at: new Date(),
          } as any
        });

        // Create CrawlLog with detailed data
        await this.prisma.crawlLog.create({
          data: {
            crawl_date: task.date,
            crawl_type: `SYNC_TASK_${task.type}_B${task.branch_id}`,
            status: 'success',
            records_count: totalRecords,
            customers_count: allFoundCustomerIds.size,
            appointments_count: appointmentsCount,
            services_count: 0, // Placeholder, real count is in SyncTask
            treatments_count: 0, // Placeholder
            sales_total: daySales,
            revenue_total: dayRevenue,
            duration_seconds: task.last_run_at ? (Date.now() - task.last_run_at.getTime()) / 1000 : 0,
          } as any
        });

        return { success: true, records: totalRecords };
      }

    } catch (error: any) {
      this.logger.error(`[TASK ${taskId}] Failed: ${error.message}`);
      await this.prisma.syncTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          error_message: error.message,
          retry_count: { increment: 1 },
          updated_at: new Date(),
        }
      });

      // Tạo CrawlLog lỗi để hiển thị lên UI
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: task.date,
          crawl_type: `SYNC_TASK_${task.type}_B${task.branch_id}`,
          status: 'failed',
          error_message: error.message,
          duration_seconds: task.last_run_at ? (Date.now() - task.last_run_at.getTime()) / 1000 : 0,
        } as any
      });
      throw error;
    }
  }
}
