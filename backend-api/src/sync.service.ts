
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
  private recentlySyncedCustomers = new Map<number, number>(); // customerId -> timestamp
  private isFutureSyncing = false;
  private tabConfigCache: Map<string, boolean> | null = null;
  private lastTabConfigFetch = 0;

  private async getTabSyncConfig() {
    const now = Date.now();
    if (this.tabConfigCache && (now - this.lastTabConfigFetch < 30000)) {
      return this.tabConfigCache;
    }
    
    try {
      const configs = await this.prisma.cronConfig.findMany();
      const map = new Map<string, boolean>();
      for (const c of configs) {
        map.set(c.id, c.enabled);
      }
      this.tabConfigCache = map;
      this.lastTabConfigFetch = now;
      return map;
    } catch (e) {
      this.logger.error(`Error loading tab config cache: ${e.message}`);
      return new Map<string, boolean>();
    }
  }


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

  async getSyncStatus() {
    let queueCounts: any = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    try {
      queueCounts = await this.syncQueue.getJobCounts();
    } catch (e: any) {
      this.logger.error(`Error getting job counts: ${e.message}`);
    }

    let taskSummary = { pending: 0, processing: 0, success: 0, failed: 0 };
    try {
      const tasks = await this.prisma.syncTask.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      for (const t of tasks) {
        const status = t.status.toLowerCase();
        if (status === 'pending') taskSummary.pending = t._count.id;
        else if (status === 'processing') taskSummary.processing = t._count.id;
        else if (status === 'success') taskSummary.success = t._count.id;
        else if (status === 'failed') taskSummary.failed = t._count.id;
      }
    } catch (e) {
      this.logger.error(`Error grouping sync tasks: ${e.message}`);
    }

    return {
      ...this.syncStatus,
      queueCounts,
      taskSummary
    };
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

    // 2. Xóa các job trong BullMQ và Redis trực tiếp
    try {
      await this.syncQueue.drain(true).catch(() => {});
      await this.syncQueue.clean(0, 1000, 'active').catch(() => {});
      await this.syncQueue.clean(0, 1000, 'wait').catch(() => {});
      await this.syncQueue.clean(0, 1000, 'delayed').catch(() => {});
      await this.syncQueue.clean(0, 1000, 'failed').catch(() => {});
      
      const redis = await (this.syncQueue as any).client;
      const pattern = 'bull:sync-queue:*';
      let cursor = '0';
      let deletedCount = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');
      
      this.addLog(`✅ Đã xóa các Job trong BullMQ (Xóa ${deletedCount} key Redis trực tiếp)`);
    } catch (e) {
      this.addLog(`⚠️ Lỗi khi xóa hàng đợi Redis: ${e.message}`);
    }

    // 3. Cập nhật database: Reset các task PROCESSING, QUEUED, FAILED về PENDING
    try {
      const updated = await this.prisma.syncTask.updateMany({
        where: {
          status: { in: ['PROCESSING', 'QUEUED', 'FAILED'] }
        },
        data: {
          status: 'PENDING',
          completed_details: 0,
          total_details: 0,
          error_message: null
        }
      });
      this.addLog(`✅ Đã đặt lại ${updated.count} task về PENDING trong Database`);
    } catch (e) {
      this.addLog(`⚠️ Lỗi khi cập nhật SyncTasks: ${e.message}`);
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
    const possible = res.Table || res.data || res.Data || res.Items || res.Table1 || res.dtMain;
    if (Array.isArray(possible)) return possible;
    
    // Handle objects with numeric keys: { "0": {...}, "1": {...} }
    const target = possible || res;
    const keys = Object.keys(target);
    if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
      return Object.values(target);
    }

    return [];
  }

  private parseCommaId(val: any): number {
    if (!val) return 0;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  private async resolveAppointmentService(
    treatId: number,
    careId: number,
    rawServiceId: number,
    typeName: string | null,
    serviceNameInput: string | null
  ): Promise<{ service_id: number; service_name: string }> {
    let resolvedServiceId = 0;
    let resolvedServiceName = '';

    // 1. Nếu có dịch vụ điều trị (ServiceTreat) thì ưu tiên ánh xạ trực tiếp
    if (treatId > 0) {
      resolvedServiceId = treatId;
      const s = await this.prisma.service.findUnique({ where: { id: treatId }, select: { name: true } });
      resolvedServiceName = s?.name || serviceNameInput || 'Điều trị';
    } 
    // 2. Nếu có dịch vụ chăm sóc (ServiceCare)
    else if (careId > 0) {
      // Tìm dịch vụ bất kỳ thuộc nhóm này để liên kết group_id (phễu)
      const groupService = await this.prisma.service.findFirst({
        where: { group_id: careId },
        select: { id: true }
      });
      if (groupService) {
        resolvedServiceId = groupService.id;
      } else {
        // Không gán group_id (careId) vào service_id để tránh đụng độ với các service.id tự tăng khác
        resolvedServiceId = 0;
      }
      
      // Lấy tên nhóm dịch vụ làm service_name hiển thị (Ví dụ: "CSD cơ bản")
      const g = await this.prisma.serviceGroup.findUnique({ where: { id: careId }, select: { name: true } });
      resolvedServiceName = g?.name || serviceNameInput || 'CSD cơ bản';
    } 
    // 3. Fallback sang ServiceID thô
    else if (rawServiceId > 0) {
      resolvedServiceId = rawServiceId;
      const s = await this.prisma.service.findUnique({ where: { id: rawServiceId }, select: { name: true } });
      resolvedServiceName = s?.name || serviceNameInput || '';
    } 
    // 4. Mặc định
    else {
      resolvedServiceId = 0;
      resolvedServiceName = serviceNameInput || typeName || '';
    }

    return {
      service_id: resolvedServiceId,
      service_name: resolvedServiceName
    };
  }

  private async resolveCreatedById(createdPer: any, createdId: any): Promise<number | null> {
    let resolvedId = parseInt(createdId) || null;
    if (!resolvedId && createdPer) {
      const empId = parseInt(createdPer);
      if (empId > 0) {
        const emp = await this.prisma.employee.findUnique({
          where: { id: empId },
          select: { name: true }
        });
        if (emp?.name) {
          const usr = await this.prisma.user.findFirst({
            where: { full_name: { equals: emp.name, mode: 'insensitive' } },
            select: { id: true }
          });
          if (usr) {
            resolvedId = usr.id;
          } else {
            resolvedId = empId;
          }
        } else {
          resolvedId = empId;
        }
      }
    }
    return resolvedId;
  }

  private getVietnamDateString(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
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
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleDailySync' } }).catch(() => null);
    if (config && !config.enabled) {
      this.logger.log('🚫 [CRON] handleDailySync bị vô hiệu hóa trong cấu hình.');
      return;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = this.getVietnamDateString(yesterday);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFromStr = this.getVietnamDateString(thirtyDaysAgo);
    
    this.logger.log(`[CRON] Khởi chạy đồng bộ hàng ngày (30 ngày qua: từ ${dateFromStr} đến ${dateStr})...`);
    await this.syncByRange(dateFromStr, dateStr);

    // Đồng bộ 30 ngày lịch hẹn trước để đảm bảo 100% lịch hẹn trước
    this.logger.log('[CRON] Khởi chạy đồng bộ sâu 30 ngày lịch hẹn trước (daily deep sync)...');
    await this.syncFutureAppointments(30).catch(err => {
      this.logger.error(`Lỗi đồng bộ lịch hẹn trước 30 ngày: ${err.message}`);
    });
  }

  @Cron('0 */5 * * * *')
  async handleHeartbeat() {
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleHeartbeat' } }).catch(() => null);
    if (config && !config.enabled) {
      return;
    }
    this.logger.log('💓 [HEARTBEAT] Đang duy trì nhịp đập Session cho các tài khoản...');
    try {
      const result = await this.vttechApi.checkLoginStatus();
      const msg = result.success
        ? `Session ổn định (${result.accounts} tài khoản)`
        : `Phát hiện Session yếu: ${result.message}`;
      if (result.success) {
        this.logger.log(`✅ [HEARTBEAT] ${msg}`);
      } else {
        this.logger.warn(`⚠️ [HEARTBEAT] ${msg}`);
      }

      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleHeartbeat',
          status: 'success',
          message: msg,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    } catch (e: any) {
      this.logger.error(`🔥 [HEARTBEAT ERROR] ${e.message}`);
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleHeartbeat',
          status: 'failed',
          error_message: e.message,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    }
  }

  @Cron('0 */20 * * * *')
  async handleFrequentSync() {
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleFrequentSync' } }).catch(() => null);
    if (config && !config.enabled) {
      this.logger.log('🚫 [CRON] handleFrequentSync bị vô hiệu hóa trong cấu hình.');
      return;
    }
    const today = new Date();
    const todayStr = this.getVietnamDateString(today);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.getVietnamDateString(yesterday);

    this.logger.log(`[CRON] Bắt đầu đồng bộ định kỳ 20p cho 2 ngày qua: từ ${yesterdayStr} đến ${todayStr}`);
    // Sync current day and yesterday without PBX but with detail workers
    try {
      if (this.syncStatus.isSyncing) {
        this.addLog('⏩ Đồng bộ định kỳ 20p bỏ qua do hệ thống đang bận.');
        return;
      }
      await this.syncByRange(yesterdayStr, todayStr, false, false, true);
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleFrequentSync',
          status: 'success',
          message: `Đồng bộ nhanh từ ${yesterdayStr} đến ${todayStr} thành công`,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    } catch (e: any) {
      this.logger.error(`Lỗi đồng bộ 20p: ${e.message}`);
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleFrequentSync',
          status: 'failed',
          error_message: e.message,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    }
  }

  @Cron('0 15,45 * * * *') // Chạy mỗi 30 phút (tại phút thứ 15 và 45) để tối ưu tải hệ thống
  async handleFutureAppointmentsSyncCron() {
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleFutureAppointmentsSync' } }).catch(() => null);
    if (config && !config.enabled) {
      return;
    }
    this.logger.log('[CRON] Bắt đầu đồng bộ định kỳ lịch hẹn trước cho 7 ngày tới...');
    await this.syncFutureAppointments(7);
  }

  async syncFutureAppointments(daysAhead: number = 7) {
    if (this.isFutureSyncing) {
      this.logger.log('⏩ Bỏ qua đồng bộ lịch hẹn trước do một phiên đồng bộ lịch hẹn tương lai khác đang chạy.');
      return;
    }
    this.isFutureSyncing = true;
    this.logger.log(`🔮 Bắt đầu đồng bộ lịch hẹn trước cho ${daysAhead} ngày tới...`);
    try {
      const branches = await this.prisma.branch.findMany({
        where: { is_active: 1 }
      });
      
      const today = new Date();
      const dates: string[] = [];
      for (let i = 1; i <= daysAhead; i++) {
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + i);
        dates.push(this.getVietnamDateString(nextDay));
      }

      this.addLog(`🔮 Đồng bộ lịch hẹn trước cho các ngày: ${dates.join(', ')}`);

      // Khởi tạo đăng nhập & XSRF token
      const loggedIn = await this.vttechApi.login();
      if (!loggedIn) throw new Error('Đăng nhập thất bại khi chuẩn bị đồng bộ lịch hẹn trước');
      await this.vttechApi.getXsrfToken();

      for (const dateStr of dates) {
        this.addLog(`🔮 Đang quét lịch hẹn tương lai ngày: ${dateStr}`);
        for (const branch of branches) {
          try {
            const appIds = await this.syncAppointments(dateStr, dateStr, branch.id);
            if (appIds.length > 0) {
              this.addLog(`   ✅ [${branch.name}] Đã đồng bộ ${appIds.length} lịch hẹn trước ngày ${dateStr}`);
            }
          } catch (err: any) {
            this.addLog(`   ⚠️ [${branch.name}] Lỗi đồng bộ lịch hẹn trước ngày ${dateStr}: ${err.message}`);
          }
          // Nghỉ ngắn tránh spam API
          await new Promise(r => setTimeout(r, 200));
        }
      }
      this.addLog(`🔮 Hoàn tất đồng bộ lịch hẹn trước cho ${daysAhead} ngày tới.`);
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleFutureAppointmentsSync',
          status: 'success',
          message: `Hoàn tất đồng bộ lịch hẹn trước cho ${daysAhead} ngày tới`,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    } catch (e: any) {
      this.logger.error(`Lỗi đồng bộ lịch hẹn trước: ${e.message}`);
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleFutureAppointmentsSync',
          status: 'failed',
          error_message: e.message,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    } finally {
      this.isFutureSyncing = false;
    }
  }

  @Cron('0 */30 * * * *') // Mỗi 30 phút kiểm tra và giải quyết 1 phần dữ liệu cũ
  async handleHistoricalSyncCron() {
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleHistoricalSyncCron' } }).catch(() => null);
    if (config && !config.enabled) {
      this.logger.log('🚫 [CRON] handleHistoricalSyncCron bị vô hiệu hóa trong cấu hình.');
      return;
    }
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
          { date: 'desc' }, // Quy trình chuẩn: Đồng bộ cuốn chiếu ngược từ gần nhất về trước
          { id: 'asc' }
        ],
        take: 50 // Giảm xuống 50 để tránh làm ngập hàng đợi (Queue flood)
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
          data: { status: 'QUEUED', last_run_at: new Date() }
        });

        await this.syncQueue.add('sync-job', {
          type: 'sync-task',
          data: { taskId: task.id }
        }, {
          jobId: `hist-task-${task.id}`,
          priority: 10, 
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 }
        });
      }
    } catch (e) {
      this.logger.error(`Lỗi trong handleHistoricalSyncCron: ${e.message}`);
    }
  }

  @Cron('0 */10 * * * *') // Chạy mỗi 10 phút để tự chữa lành nhanh hơn
  async handleStaleTasksCron() {
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleStaleTasksCron' } }).catch(() => null);
    if (config && !config.enabled) {
      return;
    }
    this.logger.log('🕵️ Đang kiểm tra và tự sửa lỗi các task bị kẹt (Self-healing)...');

    // 0. Kiểm tra nếu cờ isSyncing bị kẹt (Tách riêng để chạy độc lập không bị chặn bởi lỗi khác)
    try {
      if (this.syncStatus.isSyncing && this.syncStatus.startTime) {
        const syncDuration = Date.now() - this.syncStatus.startTime;
        if (syncDuration > 4 * 60 * 60 * 1000) { // Giảm xuống 4 tiếng
          this.logger.error('🚨 Trạng thái hệ thống bận (isSyncing) bị kẹt. Tự động reset.');
          this.syncStatus.isSyncing = false;
          this.syncStatus.startTime = null;
          this.addLog('🚨 Tự động giải phóng trạng thái bận sau 4h kẹt.');
        }
      }
    } catch (e) {
      this.logger.error(`Lỗi giải phóng isSyncing: ${e.message}`);
    }

    try {
      // 1. Giải phóng các task bị kẹt trong DB (PROCESSING hoặc QUEUED quá lâu)
      // Tăng thời gian lên 180 phút để tránh reset nhầm khi queue bận xử lý backlog
      const staleTime = new Date(Date.now() - 180 * 60 * 1000); 
      
      const staleTasks = await this.prisma.syncTask.findMany({
        where: {
          status: { in: ['PROCESSING', 'QUEUED'] },
          updated_at: { lt: staleTime }
        },
        select: { id: true, date: true }
      });

      if (staleTasks.length > 0) {
        this.logger.warn(`🧹 Phát hiện ${staleTasks.length} task bị kẹt (PROCESSING/QUEUED) trong Database. Đang reset...`);
        
        for (const task of staleTasks) {
           // Thử xóa job tương ứng trong BullMQ nếu còn tồn tại và đang active/stalled
           const jobId = `hist-task-${task.id}`;
           const job = await this.syncQueue.getJob(jobId);
           if (job) {
              const state = await job.getState();
              if (state === 'active' || state === 'waiting') {
                 await job.remove();
                 this.logger.log(`   🗑️ Đã xóa Job ${jobId} khỏi Queue do bị kẹt.`);
              }
           }

           await this.prisma.syncTask.update({
             where: { id: task.id },
             data: {
               status: 'PENDING',
               updated_at: new Date(),
               error_message: 'Hệ thống tự động phát hiện kẹt và reset (Self-healing).'
             }
           });
        }
        this.addLog(`🧹 Đã tự động giải phóng ${staleTasks.length} task bị kẹt.`);
      }

      // 2. Kiểm tra các job mồ côi trong BullMQ (active quá lâu mà không update)
      const activeJobs = await this.syncQueue.getActive();
      for (const job of activeJobs) {
         const age = Date.now() - job.timestamp;
         // Nếu job active quá 1 tiếng mà không hoàn thành
         if (age > 60 * 60 * 1000) {
            this.logger.warn(`⚠️ Phát hiện Job ${job.id} active quá lâu (${Math.round(age/60000)}p). Đang xóa để retry...`);
            await job.remove();
         }
      }

      // 3. Xử lý các task bị kẹt ở 99% (đã xong sub-jobs nhưng chưa chuyển trạng thái)
      //    Bao gồm cả trường hợp "near-complete timeout": >= 90% done + idle > 30 phút
      //    → Các detail job còn lại đã bị mất (fail hết retry hoặc bị cleanup) nên completed
      //      counter trong Redis không bao giờ đạt total. Tự động hoàn tất để tránh kẹt vĩnh viễn.
      const nearCompleteIdleTime = new Date(Date.now() - 30 * 60 * 1000); // 30 phút
      const almostDoneTasks = await this.prisma.syncTask.findMany({
        where: {
          status: 'PROCESSING',
          total_details: { gt: 0 },
          completed_details: { gte: 0 } // Sẽ filter ở dưới cho chính xác
        }
      });

      for (const task of almostDoneTasks) {
        const completionRate = task.completed_details / task.total_details;

        if (task.completed_details >= task.total_details) {
          // Case A: 100% done nhưng status chưa chuyển (race condition)
          this.logger.log(`✅ [TASK ${task.id}] Tự động hoàn tất (100% fix)`);
          await this.prisma.syncTask.update({
            where: { id: task.id },
            data: { status: 'SUCCESS', updated_at: new Date() }
          });
        } else if (completionRate >= 0.9 && task.updated_at < nearCompleteIdleTime) {
          // Case B: >= 90% done + idle > 30 phút → detail jobs còn lại đã bị mất
          const gap = task.total_details - task.completed_details;
          this.logger.warn(
            `⚠️ [TASK ${task.id}] Near-complete timeout: ${task.completed_details}/${task.total_details} ` +
            `(${Math.round(completionRate * 100)}%), ${gap} detail jobs bị mất. Tự động hoàn tất.`
          );
          await this.prisma.syncTask.update({
            where: { id: task.id },
            data: {
              status: 'SUCCESS',
              updated_at: new Date(),
              error_message: `Tự động hoàn tất (near-complete): ${task.completed_details}/${task.total_details} done, ${gap} detail jobs bị mất sau 30p idle.`
            }
          });
        }
      }

      // 4. Tự động thử lại các task FAILED sau một khoảng thời gian (ví dụ: 2 tiếng)
      // Chỉ tự động thử lại tối đa 10 lần để tránh lặp vô tận khi gặp lỗi nghiêm trọng
      const retryableTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const failedTasks = await this.prisma.syncTask.findMany({
        where: {
          status: 'FAILED',
          retry_count: { lt: 10 },
          updated_at: { lt: retryableTime }
        }
      });

      if (failedTasks.length > 0) {
        this.logger.warn(`🔄 Phát hiện ${failedTasks.length} task FAILED cũ. Đang tự động chuyển về PENDING để chạy lại...`);
        for (const task of failedTasks) {
          await this.prisma.syncTask.update({
            where: { id: task.id },
            data: {
              status: 'PENDING',
              updated_at: new Date(),
              error_message: `Hệ thống tự động reset để chạy lại sau thất bại trước đó: ${task.error_message?.slice(0, 150)}`
            }
          });
        }
        this.addLog(`🔄 Đã chuyển ${failedTasks.length} task FAILED về PENDING.`);
      }
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleStaleTasksCron',
          status: 'success',
          message: `Tự chữa lành hoàn tất (Giải phóng ${staleTasks.length} task bị kẹt, ${failedTasks.length} task failed chuyển về pending)`,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    } catch (e: any) {
      this.logger.error(`Lỗi trong handleStaleTasksCron: ${e.message}`);
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleStaleTasksCron',
          status: 'failed',
          error_message: e.message,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleQueueCleanupCron() {
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleQueueCleanupCron' } }).catch(() => null);
    if (config && !config.enabled) {
      return;
    }
    this.logger.log('🧹 Đang dọn dẹp hàng đợi BullMQ...');
    try {
      // Dọn dẹp các job đã hoàn thành quá 1 tiếng
      const cleanedCompleted = await this.syncQueue.clean(3600000, 1000, 'completed');
      // Dọn dẹp các job thất bại quá 24 tiếng
      const cleanedFailed = await this.syncQueue.clean(86400000, 1000, 'failed');
      
      let msg = 'Không có job nào cần dọn dẹp.';
      if (cleanedCompleted.length > 0 || cleanedFailed.length > 0) {
        msg = `Đã dọn dẹp BullMQ: ${cleanedCompleted.length} completed, ${cleanedFailed.length} failed jobs.`;
        this.logger.log(`🧹 ${msg}`);
      }
      
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleQueueCleanupCron',
          status: 'success',
          message: msg,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    } catch (e: any) {
      this.logger.error(`Lỗi dọn dẹp Queue: ${e.message}`);
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleQueueCleanupCron',
          status: 'failed',
          error_message: e.message,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    }
  }

  @Cron('0 0 8,20 * * *') // Báo cáo định kỳ lúc 08:00 và 20:00
  async handleDailyReporting() {
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleDailyReporting' } }).catch(() => null);
    if (config && !config.enabled) {
      return;
    }
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
    if (start <= end) {
      let currentDay = new Date(start);
      while (currentDay <= end) {
        days.push(this.getVietnamDateString(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }
    } else {
      let currentDay = new Date(start);
      while (currentDay >= end) {
        days.push(this.getVietnamDateString(currentDay));
        currentDay.setDate(currentDay.getDate() - 1);
      }
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
        this.syncStatus.total = totalSteps;
        this.syncStatus.current = currentStep;
        this.syncStatus.progress = Math.round((currentStep / totalSteps) * 100);
        this.syncStatus.message = `Đang đồng bộ doanh thu ${dateStr} (${currentStep}/${totalSteps}): ${branch.name}`;
        
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
                  data: { customerId: cId, parentTaskId: undefined }
                }, {
                  jobId: `detail-${cId}-manual-${Date.now()}`,
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
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      
      if (start <= end) {
        let curr = new Date(start);
        while (curr <= end) {
          days.push(this.getVietnamDateString(curr));
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        let curr = new Date(start);
        while (curr >= end) {
          days.push(this.getVietnamDateString(curr));
          curr.setDate(curr.getDate() - 1);
        }
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
          this.syncStatus.total = totalSteps;
          this.syncStatus.current = currentStep;
          this.syncStatus.message = `Đang đồng bộ ${dateStr} (${currentStep}/${totalSteps}): ${branch.name}`;
          this.syncStatus.progress = Math.round((currentStep / totalSteps) * 90);

          // 1. Lấy danh sách khách hàng và lịch hẹn
          const branchCustomerIds: number[] = [];
          let appointmentCount = 0;
          try {
            // Chạy tuần tự các loại khách hàng để giảm tải API cùng lúc
            const ids5 = await this.syncCustomers(dateStr, dateStr, 5, branch.id).catch(e => {
              this.addLog(`  ⚠️ Lỗi quét khách hàng loại 5: ${e.message}`);
              return [];
            });
            const ids2 = await this.syncCustomers(dateStr, dateStr, 2, branch.id).catch(e => {
              this.addLog(`  ⚠️ Lỗi quét khách hàng loại 2: ${e.message}`);
              return [];
            });
            const ids3 = await this.syncCustomers(dateStr, dateStr, 3, branch.id).catch(e => {
              this.addLog(`  ⚠️ Lỗi quét khách hàng loại 3: ${e.message}`);
              return [];
            });
            const appIds = await this.syncAppointments(dateStr, dateStr, branch.id).catch(e => {
              this.addLog(`  ⚠️ Lỗi quét lịch hẹn: ${e.message}`);
              return [];
            });

            branchCustomerIds.push(...ids5, ...ids2, ...ids3, ...appIds);
            appointmentCount = appIds.length;
          } catch (e) {
            this.addLog(`  ❌ [${branch.name}] Lỗi khi quét khách hàng/lịch hẹn: ${e.message}`);
          }

          // Nhường CPU và nghỉ ngắn giữa các chi nhánh
          await new Promise(r => setTimeout(r, 1000));

          // 2. Lấy dữ liệu tài chính từ 3 nguồn API
          let daySales = 0;
          let dayRevenue = 0;
          try {
            const [rawRev, rawPay, rawDep] = await Promise.all([
              this.vttechApi.getRevenueByBranch(dateStr, dateStr, branch.id),
              this.vttechApi.getPaymentByBranch(dateStr, dateStr, branch.id),
              this.vttechApi.getDepositByBranch(dateStr, dateStr, branch.id),
            ]);

            // Kiểm tra nếu có bất kỳ nguồn dữ liệu nào trả về null (lỗi session/redirect)
            if (rawRev === null || rawPay === null || rawDep === null) {
              throw new Error(`Nhận được dữ liệu null từ API VTTech (Rev: ${rawRev === null}, Pay: ${rawPay === null}, Dep: ${rawDep === null}). Bỏ qua đồng bộ chi nhánh này để tránh xóa dữ liệu.`);
            }

            const revData = this.ensureArray(rawRev);
            const payData = this.ensureArray(rawPay);
            const depData = this.ensureArray(rawDep);

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
            const hasDetails = uniqueBranchIds.length > 0;
            const finalStatus = syncDetails ? (hasDetails ? 'PROCESSING' : 'SUCCESS') : 'COMPLETED';

            await this.prisma.syncTask.update({
              where: { id: task.id },
              data: {
                customers_count: uniqueBranchIds.length,
                appointments_count: appointmentCount,
                sales_total: daySales,
                revenue_total: dayRevenue,
                total_details: uniqueBranchIds.length,
                completed_details: 0,
                status: finalStatus,
                updated_at: new Date(),
              } as any,
            });

            // Queue detail jobs if syncDetails is enabled
            if (syncDetails && hasDetails) {
              this.addLog(`  🔍 Đang đẩy ${uniqueBranchIds.length} khách hàng của [${branch.name}] vào hàng đợi đồng bộ chi tiết...`);
              let count = 0;
              for (const cId of uniqueBranchIds) {
                count++;
                await this.syncQueue.add('sync-job', {
                  type: 'sync-customer-detail',
                  data: { customerId: cId, parentTaskId: task.id }
                }, {
                  jobId: `detail-${cId}-task-${task.id}`,
                  removeOnComplete: true,
                  attempts: 3,
                  priority: 5,
                  backoff: { type: 'exponential', delay: 10000 },
                });
                
                if (count % 20 === 0) {
                  await this.prisma.syncTask.update({
                    where: { id: task.id },
                    data: { updated_at: new Date() }
                  }).catch(() => {});
                  await new Promise(resolve => setImmediate(resolve));
                }
              }
            }

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
        // Nếu lỗi do session, chúng ta có thể dừng ở đây để Job BullMQ retry
        throw e; 
      }

      const dataItems = this.ensureArray(res);

      if (dataItems.length > 0) {
        this.addLog(`  📥 Nhận được ${dataItems.length} khách hàng từ bản ghi thứ ${start} (Type: ${type})`);
        
        // Cập nhật message để hiển thị số lượng bản ghi đã xử lý lên UI
        const baseMsg = this.syncStatus.message.split(' (Đã quét')[0];
        this.syncStatus.message = `${baseMsg} (Đã quét ${start + dataItems.length} KH loại ${type})`;
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
            const code = c.CustCode || c.Cust_Code || c.Document_Code || null;

            if (sourceId) {
              await this.ensureSourceExists(sourceId);
            }
            if (branchIdFromData) {
              await this.ensureBranchExists(branchIdFromData);
            }

            const currentHash = this.generateHash({ name, phone, email, paid, debt, branchIdFromData, gender, birthday, address, sourceId, code });
            const existingCustomer = await this.prisma.customer.findUnique({ where: { id } });

            if (!existingCustomer || existingCustomer.last_hash !== currentHash) {
              // Timeline Guard: Bảo vệ tổng chi tiêu và công nợ không bị ghi đè ngược bởi dữ liệu lịch sử cũ
              const finalSpent = existingCustomer ? Math.max(existingCustomer.total_spent, paid) : paid;
              const finalDebt = existingCustomer ? (existingCustomer.total_spent > paid ? existingCustomer.total_debt : debt) : debt;

              // Timeline Guard for profile details:
              // Only overwrite profile fields if we don't already have a newer activity record in daily_customers
              let shouldUpdateProfile = true;
              if (existingCustomer) {
                const parsedDate = this.parseDate(dateFrom);
                if (parsedDate) {
                   const maxDaily = await this.prisma.dailyCustomer.findFirst({
                     where: { customer_id: id },
                     orderBy: { date: 'desc' },
                     select: { date: true }
                   });
                   if (maxDaily && maxDaily.date > parsedDate) {
                     shouldUpdateProfile = false;
                   }
                }
              }

              await this.prisma.customer.upsert({
                where: { id },
                update: {
                  ...(shouldUpdateProfile ? {
                    name,
                    phone,
                    email,
                    branch_id: branchIdFromData,
                    gender,
                    birthday,
                    address,
                    source_id: sourceId,
                    code,
                  } : {}),
                  total_spent: finalSpent,
                  total_debt: finalDebt,
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
                  code,
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
            // Heartbeat & Yield every 25 customers
            if (customerIds.length % 25 === 0) {
              await new Promise(resolve => setImmediate(resolve));
            }
          } catch (e) {
            this.addLog(`❌ [ID: ${c.CustID || c.ID}] Lỗi upsert khách hàng: ${e.message}`);
          }
        }
        start += length;
        if (dataItems.length < length) hasMore = false;
        
        // Nghỉ ngắn giữa các trang
        await new Promise(r => setTimeout(r, 200));
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
      // Cập nhật message để hiển thị số lượng lịch hẹn đã quét
      const baseMsg = this.syncStatus.message.split(' (Đã quét')[0];
      this.syncStatus.message = `${baseMsg} (Đã quét ${dataItems.length} lịch hẹn)`;
      for (const a of dataItems) {
        try {
          const id = parseInt(a.ID || a.ScheduleID || a.id || a.AppID);
          const customerId = parseInt(a.CustomerID || a.customer_id || a.CustID);
          if (!id) continue;
          
          const treatId = this.parseCommaId(a.ServiceTreat_ID || a.ServiceTreat);
          const careId = this.parseCommaId(a.ServiceCare_ID || a.ServiceCare);
          const rawServiceId = this.parseCommaId(a.ServiceID || a.Service);
          const resolved = await this.resolveAppointmentService(
            treatId,
            careId,
            rawServiceId,
            a.TypeName || null,
            a.ServiceName || null
          );

          if (customerId) {
            const customerBranchId = parseInt(a.BranchID || a.branch_id || a.BranchId) || branchId || null;
            if (customerBranchId) {
              await this.ensureBranchExists(customerBranchId);
            }
            
            // Lấy thông tin hiện tại của KH để tránh ghi đè dữ liệu tốt
            const existing = await this.prisma.customer.findUnique({
              where: { id: customerId },
              select: { name: true, phone: true }
            }).catch(() => null);

            const appointmentCustName = a.CustName || a.CustomerName || a.Customer_Name || '';
            const appointmentCustPhone = a.Phone || a.Mobile || a.CustPhone || '';

            await this.prisma.customer.upsert({
              where: { id: customerId },
              update: {
                // Chỉ cập nhật nếu tên trong DB trống hoặc là 'Unknown'
                name: (!existing?.name || existing.name === 'Unknown') && appointmentCustName ? appointmentCustName : undefined,
                // Chỉ cập nhật nếu số điện thoại trong DB trống
                phone: (!existing?.phone) && appointmentCustPhone ? appointmentCustPhone : undefined,
              },
              create: {
                id: customerId,
                name: appointmentCustName || 'Unknown',
                phone: appointmentCustPhone || null,
                branch_id: customerBranchId
              }
            }).catch(err => {
              this.logger.error(`   ❌ [Loicansua] Pre-creating/updating customer ID ${customerId} failed: ${err.message}`);
            });
          }

          const isCancel = parseInt(a.IsCancel) > 0 || parseInt(a.ReasonCancel) > 0 || parseInt(a.State) === 0;
          const isRaVe = parseInt(a.TypeStatusID) === 3;
          const nextStatus = isCancel ? 3 : isRaVe ? 2 : 1;
          const nextStatusName = a.StatusName || (isCancel ? 'Đã Hủy' : isRaVe ? 'Ra Về' : 'Đặt Hẹn');

          await this.prisma.appointment.upsert({
            where: { id },
            update: {
              vttech_code: a.Code || a.CodeScheduler || null,
              customer_id: customerId,
              customer_name: a.CustName || a.CustomerName || a.Customer_Name || '',
              phone: a.Phone || a.Mobile || a.CustPhone || '',
              branch_id: branchId || parseInt(a.BranchID || a.branch_id || a.BranchId) || undefined,
              branch_name: a.BranchName || a.Branch || '',
              service_id: resolved.service_id,
              service_name: resolved.service_name,
              employee_id: parseInt(a.DoctorID || a.EmployeeID || a.Doctor) || 0,
              employee_name: a.DoctorName || a.EmployeeName || a.Doctor || '',
              created_by_id: await this.resolveCreatedById(a.CreatedPer, a.CreatedID),
              vttech_created_at: this.parseDate(a.CreatedDate || a.Created),
              status: nextStatus,
              status_name: nextStatusName,
              type_name: a.TypeName || null,
              appointment_date: this.parseDate(a.DateFrom || a.Date || a.AppointmentDate || a.CreatedDate || a.Created) || new Date(),
              note: a.Note || a.Content || '',
            },
            create: {
              id,
              vttech_code: a.Code || a.CodeScheduler || null,
              customer_id: customerId,
              customer_name: a.CustName || a.CustomerName || a.Customer_Name || '',
              phone: a.Phone || a.Mobile || a.CustPhone || '',
              branch_id: branchId || parseInt(a.BranchID || a.branch_id || a.BranchId) || undefined,
              branch_name: a.BranchName || a.Branch || '',
              service_id: resolved.service_id,
              service_name: resolved.service_name,
              employee_id: parseInt(a.DoctorID || a.EmployeeID || a.Doctor) || 0,
              employee_name: a.DoctorName || a.EmployeeName || a.Doctor || '',
              created_by_id: await this.resolveCreatedById(a.CreatedPer, a.CreatedID),
              vttech_created_at: this.parseDate(a.CreatedDate || a.Created),
              status: nextStatus,
              status_name: nextStatusName,
              type_name: a.TypeName || null,
              appointment_date: this.parseDate(a.DateFrom || a.Date || a.AppointmentDate || a.CreatedDate || a.Created) || new Date(),
              note: a.Note || a.Content || '',
            },
          });
          if (customerId) customerIds.push(customerId);
        } catch (e) {
          this.logger.error(`   ❌ [Loicansua] [SyncAppointments] Lỗi xử lý lịch hẹn ID ${a.ID || a.ScheduleID || a.id || a.AppID}: ${e.message}`);
        }
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
          update: { name: s.Name, code: s.Code, price: parseFloat(s.Price || 0), group_id: parseInt(s.Type) || null },
          create: { id: parseInt(s.ID), name: s.Name, code: s.Code, price: parseFloat(s.Price || 0), group_id: parseInt(s.Type) || null },
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
          update: { 
            username: u.Name || u.Account || null, 
            full_name: u.EmployeeName || u.FullName || null, 
            phone: u.Phone || null, 
            branch_id: parseInt(u.BranchID) || null, 
            role: u.RoleName || null 
          },
          create: { 
            id: parseInt(u.ID), 
            username: u.Name || u.Account || null, 
            full_name: u.EmployeeName || u.FullName || null, 
            phone: u.Phone || null, 
            branch_id: parseInt(u.BranchID) || null, 
            role: u.RoleName || null 
          },
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
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, updated_at: true }
      });
      // Nếu khách hàng đã tồn tại và được cập nhật trong vòng 7 ngày qua, bỏ qua để tránh gọi API thừa
      if (existingCustomer && (Date.now() - existingCustomer.updated_at.getTime() < 7 * 24 * 60 * 60 * 1000)) {
        this.logger.log(`⏩ [ID: ${customerId}] Bỏ qua syncCustomerGeneralInfo do đã cập nhật gần đây (< 7 ngày).`);
        return;
      }

      const res = await this.vttechApi.callHandler('/Customer/GeneralInfo/', 'Loadata', { CustomerID: customerId });
      if (res && res.Table && res.Table[0]) {
        const info = res.Table[0];
        const name = info.CustName || info.FullName || info.Name || 'Unknown';
        const code = info.Cust_Code || info.Document_Code || info.CustCode || null;
        await this.prisma.customer.upsert({
          where: { id: customerId },
          update: {
            name,
            code,
            gender: parseInt(info.Gender_ID) || null,
            branch_id: parseInt(info.BranchID) || null,
            birthday: this.parseDate(info.Birthday),
            phone: info.Phone1 || info.Phone || null,
            address: info.Address,
          },
          create: {
            id: customerId,
            name,
            code,
            gender: parseInt(info.Gender_ID) || null,
            branch_id: parseInt(info.BranchID) || null,
            birthday: this.parseDate(info.Birthday),
            phone: info.Phone1 || info.Phone || null,
            address: info.Address,
          }
        });
        this.addLog(`   ✅ [ID: ${customerId}] Đã cập nhật thông tin cơ bản (Mã KH, Giới tính, Ngày sinh, Địa chỉ)`);
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
      const res = await this.vttechApi.callHandler('/Customer/ScheduleList_Schedule/', 'Loadata', {
        CustomerID: customerId,
        TicketID: 0,
        Limit: 100,
        BeginID: 0,
        BeginDate: 0,
        IsDelete: 0,
        IsCancel: 1,
        IsTemp: 0
      });
      // Fetch customer name and phone from database to populate appointment fields
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { name: true, phone: true }
      });
      const customerName = customer?.name || '';
      const customerPhone = customer?.phone || '';

      const items = this.ensureArray(res);
      for (const item of items) {
        const sId = parseInt(item.ID);
        if (!sId) continue;

        const treatId = this.parseCommaId(item.ServiceTreat_ID || item.ServiceTreat);
        const careId = this.parseCommaId(item.ServiceCare_ID || item.ServiceCare);
        const rawServiceId = this.parseCommaId(item.ServiceID || item.Service);
        const resolved = await this.resolveAppointmentService(
          treatId,
          careId,
          rawServiceId,
          item.TypeName || null,
          item.ServiceName || null
        );

        let resolvedBranchId = branchId || parseInt(item.BranchID) || null;
        if (item.Branch) {
          const matchedBranch = await this.prisma.branch.findFirst({
            where: { name: { equals: item.Branch.trim(), mode: 'insensitive' } },
            select: { id: true }
          }).catch(() => null);
          if (matchedBranch) {
            resolvedBranchId = matchedBranch.id;
          }
        }

        await this.prisma.appointment.upsert({
          where: { id: sId },
          update: {
            vttech_code: item.Code || null,
            customer_id: customerId,
            customer_name: customerName || undefined,
            phone: customerPhone || undefined,
            appointment_date: this.parseDate(item.Date_From),
            note: item.Content || '',
            status: (parseInt(item.IsCancel) > 0)
              ? 3
              : (String(item.StatusName || '').trim() === 'Ra Về' || String(item.StatusName || '').trim() === 'Đã Đến' || String(item.StatusName || '').trim() === 'Đang Điều Trị')
                ? 2
                : 1,
            branch_id: resolvedBranchId,
            branch_name: item.Branch || '',
            employee_name: item.DoctorName || '',
            created_by_id: await this.resolveCreatedById(item.CreatedPer, item.CreatedID),
            vttech_created_at: this.parseDate(item.CreatedDate || item.Created),
            status_name: item.StatusName || null,
            type_name: item.TypeName || null,
            service_id: resolved.service_id,
            service_name: resolved.service_name,
          },
          create: {
            id: sId,
            vttech_code: item.Code || null,
            customer_id: customerId,
            customer_name: customerName,
            phone: customerPhone,
            appointment_date: this.parseDate(item.Date_From),
            note: item.Content || '',
            status: (parseInt(item.IsCancel) > 0)
              ? 3
              : (String(item.StatusName || '').trim() === 'Ra Về' || String(item.StatusName || '').trim() === 'Đã Đến' || String(item.StatusName || '').trim() === 'Đang Điều Trị')
                ? 2
                : 1,
            branch_id: resolvedBranchId,
            branch_name: item.Branch || '',
            employee_name: item.DoctorName || '',
            created_by_id: await this.resolveCreatedById(item.CreatedPer, item.CreatedID),
            vttech_created_at: this.parseDate(item.CreatedDate || item.Created),
            status_name: item.StatusName || null,
            type_name: item.TypeName || null,
            service_id: resolved.service_id,
            service_name: resolved.service_name,
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

  private async syncSingleCustomerDetail(customerId: number, parentTaskId?: number, syncDate?: string, onlyTabs?: string[]): Promise<{ payments: number, treatments: number, services: number, appointments: number }> {
    // Tối ưu: Bỏ qua nếu khách hàng này vừa mới được đồng bộ chi tiết trong vòng 1 giờ qua
    // Bỏ qua tối ưu này nếu là yêu cầu chạy thủ công tab cụ thể (onlyTabs có giá trị)
    const isManualTabSync = onlyTabs && onlyTabs.length > 0;
    const now = Date.now();
    const lastSync = this.recentlySyncedCustomers.get(customerId);
    if (!isManualTabSync && lastSync && (now - lastSync < 3600000)) { // 1 hour
      this.logger.log(`⏩ [ID: ${customerId}] Bỏ qua Full Sync chi tiết do mới thực hiện cách đây ít lâu.`);
      
      // Vẫn cần cập nhật tiến độ cho Task cha nếu có
      if (parentTaskId) {
        await this.prisma.syncTask.update({
          where: { id: parentTaskId },
          data: { completed_details: { increment: 1 }, updated_at: new Date() }
        }).catch(() => {});
      }
      return { payments: 0, treatments: 0, services: 0, appointments: 0 };
    }

    this.logger.log(`🔍 [ID: ${customerId}] 🚀 Bắt đầu Sync chi tiết khách hàng. SyncDate: ${syncDate || 'NULL'} | Manual: ${isManualTabSync}`);
    if (!isManualTabSync) {
      this.recentlySyncedCustomers.set(customerId, now);
      
      // Giới hạn kích thước cache
      if (this.recentlySyncedCustomers.size > 10000) {
        const oldestKey = this.recentlySyncedCustomers.keys().next().value;
        this.recentlySyncedCustomers.delete(oldestKey);
      }
    }

    const stats = { payments: 0, treatments: 0, services: 0, appointments: 0 };

    try {
      const tabConfigs = await this.getTabSyncConfig();
      const shouldSync = (tabId: string) => {
        if (onlyTabs && onlyTabs.length > 0) {
          return onlyTabs.includes(tabId);
        }
        return tabConfigs.get(tabId) !== false;
      };

      // 1. Nhóm khởi tạo & cơ bản (Thông Tin)
      if (shouldSync('syncTabGeneralInfo')) {
        await this.syncCustomerGeneralInfo(customerId);
      }
      
      const customer = await this.prisma.customer.findUnique({ 
        where: { id: customerId }, 
        select: { branch_id: true, phone: true } 
      });
      const branchId = customer?.branch_id || 0;

      // 2. Các nhóm dữ liệu (Chạy tuần tự để tránh nghẽn Event Loop và lỗi Lock BullMQ)
      
      // Nhóm Tài chính (Thanh toán)
      if (shouldSync('syncTabPayments')) {
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
      }
      await new Promise(resolve => setImmediate(resolve));

      // Nhóm Dịch vụ
      if (shouldSync('syncTabServiceTab')) {
        try {
          const services = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab', { CustomerID: customerId });
          const items = this.ensureArray(services);
          for (const s of items) {
            const sDate = this.parseDate(s.Created || s.Date);
            const isToday = syncDate && sDate && this.getVietnamDateString(sDate) === syncDate;
            if (isToday) stats.services++;
            const sId = parseInt(s.ID || s.id);
            if (!sId) continue;
            const servicePrice = this.parseNumber(s.Price || s.Price_Root);
            const serviceTotal = this.parseNumber(s.Price_Discounted !== undefined ? s.Price_Discounted : (s.PriceDiscounted !== undefined ? s.PriceDiscounted : (s.Total || s.Amount || 0)));
            const serviceDiscount = this.parseNumber(s.Discount_Amount || s.DiscountAmount || s.Discount_Amount_Doctor || 0);

            await this.prisma.customerServiceTab.upsert({
              where: { customer_id_service_id: { customer_id: customerId, service_id: sId } },
              update: { 
                service_name: s.ServiceName || '', quantity: parseInt(s.Quantity) || 1, 
                price: servicePrice, total: serviceTotal, discount: serviceDiscount,
                branch_id: branchId || parseInt(s.BranchID) || null, status: s.StatusName || '',
                created_at: this.parseDate(s.Created || s.Date)
              },
              create: { 
                customer_id: customerId, service_id: sId, service_name: s.ServiceName || '', 
                quantity: parseInt(s.Quantity) || 1, price: servicePrice, 
                total: serviceTotal, discount: serviceDiscount, branch_id: branchId || parseInt(s.BranchID) || null,
                status: s.StatusName || '', created_at: this.parseDate(s.Created || s.Date)
              }
            });
          }
        } catch (e) { this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab: ${e.message}`); }
      }
      await new Promise(resolve => setImmediate(resolve));

      // Nhóm Điều trị
      if (shouldSync('syncTabTreatments')) {
        try {
          const treatments = await this.vttechApi.callHandler('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadataTreatment', { 
            CustomerID: customerId, limit: 100
          });
          const items = this.ensureArray(treatments);
          for (const t of items) {
            const tDate = this.parseDate(t.Date || t.Created);
            const tDateStr = tDate ? this.getVietnamDateString(tDate) : null;
            const isToday = syncDate && tDateStr === syncDate;
            
            if (isToday) stats.treatments++;
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
      }
      await new Promise(resolve => setImmediate(resolve));

      // Nhóm Lịch Hẹn
      if (shouldSync('syncTabSchedules')) {
        stats.appointments = await this.syncCustomerSchedules(customerId, branchId);
      }

      const tasksToRun = [];
      if (shouldSync('syncTabPayments')) {
        tasksToRun.push(this.syncCustomerCards(customerId));
      }
      if (shouldSync('syncTabCareHistory')) {
        tasksToRun.push(this.syncCustomerCareHistory(customerId, branchId));
      }
      if (shouldSync('syncTabTreatmentPlans')) {
        tasksToRun.push(this.syncCustomerTreatmentPlans(customerId, branchId));
      }
      if (shouldSync('syncTabGeneralInfo')) {
        tasksToRun.push(this.syncCustomerStatus(customerId));
      }

      if (tasksToRun.length > 0) {
        await Promise.all(tasksToRun);
      }

      // Đợt 2 (Batch 2 - Thông tin phụ/tĩnh): Chỉ đồng bộ tối đa 1 lần/24h (Bỏ qua cache nếu là manual sync)
      try {
        const redis = await (this.syncQueue as any).client;
        const deepSyncCacheKey = `sync:customer:${customerId}:last_deep_sync`;
        const cached = !isManualTabSync ? await redis.get(deepSyncCacheKey) : null;

        if (cached) {
          this.logger.log(`⏩ [ID: ${customerId}] Bỏ qua đồng bộ chi tiết tĩnh do đã thực hiện trong 24h qua.`);
        } else {
          const staticTasks = [];
          
          if (shouldSync('syncTabAnamnesis')) {
            const hasAnamnesis = await this.prisma.customerAnamnesis.count({ where: { customer_id: customerId } }).catch(() => 0);
            if (hasAnamnesis === 0) {
              staticTasks.push(this.syncCustomerAnamnesis(customerId));
            }
          }
          if (shouldSync('syncTabImages')) {
            staticTasks.push(this.syncCustomerImages(customerId));
          }
          if (shouldSync('syncTabComplaints')) {
            staticTasks.push(this.syncCustomerComplaints(customerId, branchId));
          }
          if (shouldSync('syncTabTickets')) {
            staticTasks.push(this.syncCustomerTickets(customerId, branchId));
          }
          if (shouldSync('syncTabSms')) {
            staticTasks.push(this.syncCustomerSms(customerId, branchId));
          }
          if (shouldSync('syncTabVttechCalls') && customer?.phone) {
            staticTasks.push(this.syncCustomerVttechCalls(customerId, customer.phone));
          }

          if (staticTasks.length > 0) {
            await Promise.all(staticTasks);
          }

          // Chỉ lưu cache deep sync nếu không phải chạy thủ công tab đơn lẻ
          if (!isManualTabSync) {
            await redis.set(deepSyncCacheKey, '1', 'EX', 86400); // 24 hours TTL
          }
        }
      } catch (redisErr: any) {
        this.logger.warn(`⚠️ [ID: ${customerId}] Lỗi truy cập Redis Cache cho deep sync: ${redisErr.message}. Tiếp tục đồng bộ không cache.`);
        const staticTasks = [];
        
        if (shouldSync('syncTabAnamnesis')) {
          const hasAnamnesis = await this.prisma.customerAnamnesis.count({ where: { customer_id: customerId } }).catch(() => 0);
          if (hasAnamnesis === 0) {
            staticTasks.push(this.syncCustomerAnamnesis(customerId));
          }
        }
        if (shouldSync('syncTabImages')) {
          staticTasks.push(this.syncCustomerImages(customerId));
        }
        if (shouldSync('syncTabComplaints')) {
          staticTasks.push(this.syncCustomerComplaints(customerId, branchId));
        }
        if (shouldSync('syncTabTickets')) {
          staticTasks.push(this.syncCustomerTickets(customerId, branchId));
        }
        if (shouldSync('syncTabSms')) {
          staticTasks.push(this.syncCustomerSms(customerId, branchId));
        }
        if (shouldSync('syncTabVttechCalls') && customer?.phone) {
          staticTasks.push(this.syncCustomerVttechCalls(customerId, customer.phone));
        }

        if (staticTasks.length > 0) {
          await Promise.all(staticTasks);
        }
      }

    } catch (globalError) {
      this.logger.error(`[ID: ${customerId}] Critical error in syncSingleCustomerDetail: ${globalError.message}`);
    } finally {
      // Đảm bảo luôn cập nhật Task cha để không bị kẹt 99%
      if (parentTaskId) {
        try {
          const redis = await (this.syncQueue as any).client;
          const redisKey = `sync:task:${parentTaskId}:stats`;
          
          // Increment stats in Redis (Atomic & High Performance)
          // We use HINCRBY to avoid Row Locking in Postgres
          await redis.hincrby(redisKey, 'services', stats.services);
          await redis.hincrby(redisKey, 'treatments', stats.treatments);
          await redis.hincrby(redisKey, 'appointments', stats.appointments);
          const completed = await redis.hincrby(redisKey, 'completed', 1);

          // Get total_details from Redis cache or DB
          let totalDetails = await redis.hget(redisKey, 'total');
          if (!totalDetails) {
            const task = await this.prisma.syncTask.findUnique({ where: { id: parentTaskId }, select: { total_details: true } });
            if (!task) {
              // Task đã bị xóa khỏi DB! Xóa key Redis luôn để tránh rò rỉ key stats mồ côi
              await redis.del(redisKey);
              return stats;
            }
            totalDetails = task.total_details || 0;
            await redis.hset(redisKey, 'total', totalDetails);
          }

          const total = parseInt(String(totalDetails));

          // Only update DB status when finished or every 20 items to reduce load
          if (completed >= total || completed % 20 === 0) {
            const [services, treatments, appointments] = await Promise.all([
              redis.hget(redisKey, 'services'),
              redis.hget(redisKey, 'treatments'),
              redis.hget(redisKey, 'appointments')
            ]);

            await this.prisma.syncTask.update({
              where: { id: parentTaskId },
              data: {
                services_count: parseInt(services || '0'),
                treatments_count: parseInt(treatments || '0'),
                appointments_count: parseInt(appointments || '0'),
                completed_details: completed,
                updated_at: new Date(),
                status: completed >= total ? 'SUCCESS' : 'PROCESSING'
              }
            });

            if (completed >= total) {
              this.logger.log(`[TASK ${parentTaskId}] ✅ Hoàn tất 100% qua Redis Sync (${total} khách hàng)`);
              await redis.del(redisKey); // Clean up
            }
          }
        } catch (e) {
          this.logger.warn(`[TASK ${parentTaskId}] Lỗi cập nhật tiến độ qua Redis: ${e.message}`);
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

  private async syncCustomerCareHistory(customerId: number, branchId: number = 0) {
    try {
      const res = await this.vttechApi.callHandler('/Customer/History/HistoryList_Care/', 'LoadataHistory', { CustomerID: customerId, limit: 100 });
      const items = this.ensureArray(res?.Table || res);
      for (const item of items) {
        const id = parseInt(item.ID);
        if (!id) continue;
        
        let empName = item.EmployeeName || '';
        if (!empName && item.EmpID) {
          const emp = await this.prisma.employee.findUnique({ where: { id: parseInt(item.EmpID) } }).catch(() => null);
          if (emp) empName = emp.name;
        }

        await this.prisma.customerCareHistory.upsert({
          where: { customer_id_history_id: { customer_id: customerId, history_id: id } },
          update: {
            action_type: item.StatusParentName || item.TypeName || '',
            action_date: this.parseDate(item.Created || item.Date),
            employee_name: empName,
            note: item.Content || item.Note || '',
            branch_id: branchId || undefined,
          },
          create: {
            customer_id: customerId,
            history_id: id,
            action_type: item.StatusParentName || item.TypeName || '',
            action_date: this.parseDate(item.Created || item.Date),
            employee_name: empName,
            note: item.Content || item.Note || '',
            branch_id: branchId || undefined,
          }
        });
      }
      if (items.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử chăm sóc`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerCareHistory: ${e.message}`);
    }
  }

  private async syncCustomerComplaints(customerId: number, branchId: number = 0) {
    try {
      const res = await this.vttechApi.callHandler('/Customer/ComplaintList/', 'Loadata', { CustomerID: customerId });
      const items = this.ensureArray(res?.Table || res);
      for (const item of items) {
        const id = parseInt(item.ID);
        if (!id) continue;
        await this.prisma.customerComplaint.upsert({
          where: { customer_id_complaint_id: { customer_id: customerId, complaint_id: id } },
          update: {
            content: item.Content || '',
            status_name: item.StatusName || '',
            created_at: this.parseDate(item.Created || item.Date),
            branch_id: branchId || undefined,
          },
          create: {
            customer_id: customerId,
            complaint_id: id,
            content: item.Content || '',
            status_name: item.StatusName || '',
            created_at: this.parseDate(item.Created || item.Date),
            branch_id: branchId || undefined,
          }
        });
      }
      if (items.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Phàn nàn/Khiếu nại`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerComplaints: ${e.message}`);
    }
  }

  private async syncCustomerTreatmentPlans(customerId: number, branchId: number = 0) {
    try {
      const res = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab', { CustomerID: customerId });
      const items = this.ensureArray(res?.Table1);
      for (const item of items) {
        const id = parseInt(item.ID);
        if (!id) continue;
        await this.prisma.customerTreatmentPlan.upsert({
          where: { customer_id_plan_id: { customer_id: customerId, plan_id: id } },
          update: {
            service_name: item.Name || item.ServiceName || '',
            doctor_name: item.DoctorName || item.Doctor || '',
            created_at: this.parseDate(item.Date || item.Created),
            note: item.Note || '',
            branch_id: branchId || undefined,
          },
          create: {
            customer_id: customerId,
            plan_id: id,
            service_name: item.Name || item.ServiceName || '',
            doctor_name: item.DoctorName || item.Doctor || '',
            created_at: this.parseDate(item.Date || item.Created),
            note: item.Note || '',
            branch_id: branchId || undefined,
          }
        });
      }
      if (items.length > 0) this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Phác đồ điều trị`);
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerTreatmentPlans: ${e.message}`);
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

  async processQueuedCustomerDetail(customerId: number, parentTaskId?: number, onlyTabs?: string[]) {
    this.logger.log(`Worker processing customer detail: ${customerId}${onlyTabs ? ` (onlyTabs: ${onlyTabs.join(',')})` : ''}`);
    try {
      // syncSingleCustomerDetail now handles SyncTask update internally
      return await this.syncSingleCustomerDetail(customerId, parentTaskId, undefined, onlyTabs);
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

  async pushPendingTasksToQueue(limit: number = 200) {
    const tasks = await this.prisma.syncTask.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'FAILED', retry_count: { lt: 5 } }
        ]
      },
      take: limit,
      orderBy: [
        { date: 'desc' }, // Quy trình chuẩn: Đồng bộ cuốn chiếu ngược từ gần nhất về trước
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
        priority: 20, // Lower priority than detail sync
        backoff: { type: 'exponential', delay: 5000 },
      });
      
      await this.prisma.syncTask.update({
        where: { id: task.id },
        data: { status: 'QUEUED', last_run_at: new Date() }
      });
    }

    return { pushed: tasks.length };
  }

  async processQueuedSyncTask(taskId: number) {
    const task = await this.prisma.syncTask.findUnique({ where: { id: taskId } });
    if (!task || task.status === 'SUCCESS') return;

    // Chuyển sang PROCESSING ngay khi worker bắt đầu xử lý thực tế
    await this.prisma.syncTask.update({
       where: { id: taskId },
       data: { status: 'PROCESSING', updated_at: new Date() }
    });

    this.logger.log(`[TASK ${taskId}] Processing ${task.type} for branch ${task.branch_id} on ${task.date.toISOString().split('T')[0]}`);

    try {
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
          for (let idx = 0; idx < revItems.length; idx++) {
            const item = revItems[idx];
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
          }
          totalRecords += revItems.length;
        } catch (e) {
          this.logger.error(`[TASK ${taskId}] Error syncing revenue: ${e.message}`);
        }

        // Push all found customers to worker queue for FULL DETAIL sync
        if (allFoundCustomerIds.size > 0) {
          this.logger.log(`[TASK ${taskId}] Pushing ${allFoundCustomerIds.size} customers to Detail Sync queue`);
          let count = 0;
          for (const cId of allFoundCustomerIds) {
            count++;
            await this.syncQueue.add('sync-job', {
              type: 'sync-customer-detail',
              data: { customerId: cId, parentTaskId: taskId }
            }, {
              jobId: `detail-${cId}-task-${taskId}`,
              removeOnComplete: true,
              attempts: 3,
              priority: 5,
              backoff: { type: 'exponential', delay: 10000 },
            });

            // Heartbeat: Cập nhật updated_at mỗi 20 khách hàng để tránh bị coi là kẹt
            if (count % 20 === 0) {
               await this.prisma.syncTask.update({
                  where: { id: taskId },
                  data: { updated_at: new Date() }
               }).catch(() => {});
               // Nhường CPU cho event loop
               await new Promise(resolve => setImmediate(resolve));
            }
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

  async triggerManualTabSync(tabId: string, fromDateStr: string, toDateStr: string) {
    const fromDate = this.parseDate(fromDateStr);
    const toDate = this.parseDate(toDateStr);
    if (!fromDate || !toDate) throw new Error('Ngày không hợp lệ');

    // Tìm tất cả khách hàng được tạo trong khung ngày crm_created_at
    const customers = await this.prisma.customer.findMany({
      where: {
        crm_created_at: {
          gte: new Date(fromDateStr + 'T00:00:00Z'),
          lte: new Date(toDateStr + 'T23:59:59Z'),
        }
      },
      select: { id: true }
    });

    this.logger.log(`[Manual Tab Sync] Tìm thấy ${customers.length} khách hàng có ngày tạo từ ${fromDateStr} đến ${toDateStr} để chạy tab ${tabId}`);

    let pushed = 0;
    // Đăng nhập VTTech trước để sẵn sàng xử lý chi tiết (BullMQ worker sẽ reuse session này)
    await this.vttechApi.login().catch(() => {});
    await this.vttechApi.getXsrfToken().catch(() => {});

    for (const c of customers) {
      await this.syncQueue.add('sync-job', {
        type: 'sync-customer-detail',
        data: { customerId: c.id, onlyTabs: [tabId] }
      }, {
        jobId: `manual-tab-${tabId}-cust-${c.id}-${Date.now()}`,
        removeOnComplete: true,
        attempts: 3,
        priority: 15, // Ưu tiên chạy trước
        backoff: { type: 'exponential', delay: 2000 },
      });
      pushed++;
    }

    return { pushed };
  }
}
