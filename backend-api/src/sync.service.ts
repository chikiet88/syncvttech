
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
        this.logger.log(`✅ [LOGIN OK] Người dùng: ${result.user}`);
        this.logger.log(`✅ [STATUS] ${result.message}`);
      } else {
        this.logger.error(`❌ [LOGIN FAILED] ${result.message}`);
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
    
    let d: Date;
    if (dateValue instanceof Date) {
      d = dateValue;
    } else {
      d = new Date(dateValue);
    }

    if (!isNaN(d.getTime())) return d;

    // Try parsing DD/MM/YYYY
    if (typeof dateValue === 'string') {
      const parts = dateValue.split(/[\/\-\s:]/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        if (year > 1000 && !isNaN(day) && !isNaN(month)) {
          const hour = parseInt(parts[3] || '0');
          const min = parseInt(parts[4] || '0');
          const sec = parseInt(parts[5] || '0');
          d = new Date(year, month, day, hour, min, sec);
          if (!isNaN(d.getTime())) return d;
        } else if (day > 1000 && !isNaN(month) && !isNaN(year)) {
          // Format is YYYY-MM-DD
          d = new Date(day, month, year);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }

    return null;
  }

  private formatDate(s: string): string {
    if (!s) return '';
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD to DD-MM-YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return s;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySync() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    await this.syncByRange(dateStr, dateStr);
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
      this.addLog(`❌ Lỗi đồng bộ doanh thu: ${error.message}`);
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

      // 2. Lấy danh sách chi nhánh
      const branches = await this.prisma.branch.findMany({ where: { is_active: 1 } });
      this.syncStatus.total = branches.length;

      // 2. Duyệt qua từng ngày trong khoảng
      const start = this.parseDate(dateFrom);
      const end = this.parseDate(dateTo);
      if (!start || !end) {
        throw new Error(`Khoảng thời gian không hợp lệ: ${dateFrom} - ${dateTo}`);
      }
      const days: string[] = [];
      let currentDay = new Date(start);
      while (currentDay <= end) {
        days.push(currentDay.toISOString().split('T')[0]);
        currentDay.setDate(currentDay.getDate() + 1);
      }

      const syncedIdsInSession = new Set<number>();
      const totalSteps = days.length * branches.length;
      let currentStep = 0;

      const sessionStats = {
        branches: branches.length,
        customers: 0, // Will be updated at the end from syncedIdsInSession.size
        payments: 0,
        treatments: 0,
        services: 0,
      };

      for (const dateStr of days) {
        this.addLog(`📅 --- Bắt đầu đồng bộ ngày: ${dateStr} ---`);
        
        // Đồng bộ từng chi nhánh trong ngày
        for (let i = 0; i < branches.length; i++) {
          if (this.syncStatus.shouldStop) break;
          currentStep++;
          const branch = branches[i];
          
          this.syncStatus.total = totalSteps;
          this.syncStatus.current = currentStep;
          this.syncStatus.progress = Math.round((currentStep / totalSteps) * 100);
          this.syncStatus.message = `[${dateStr}] Đang xử lý: ${branch.name} (${i + 1}/${branches.length})`;
          
          // 1. Tìm kiếm khách hàng theo chi nhánh (LoadData types 1, 2, 3)
          const branchCustomerIds: number[] = [];
          this.addLog(`  👥 [${branch.name}] Tìm khách hàng mới/giao dịch/lịch sử...`);
          branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 5, branch.id)); // 5: RegDate (Hồ sơ)
          await this.sleep(1000);
          branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 2, branch.id));
          await this.sleep(1000);
          branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 3, branch.id));
          await this.sleep(2000);

          // 3. Lấy lịch hẹn của chi nhánh
          const appointmentIds = await this.syncAppointments(dateStr, dateStr, branch.id);
          branchCustomerIds.push(...appointmentIds);

          // 4. Đồng bộ chi tiết cho các khách hàng mới phát hiện trong chi nhánh này
          if (syncDetails) {
            const uniqueBranchIds = [...new Set(branchCustomerIds)].filter(id => !syncedIdsInSession.has(id));
            if (uniqueBranchIds.length > 0) {
              const oldMsg = this.syncStatus.message;
              let detailedStep = 0;
              for (const customerId of uniqueBranchIds) {
                if (this.syncStatus.shouldStop) break;
                detailedStep++;
                if (detailedStep % 5 === 0) {
                  this.syncStatus.message = `[${dateStr}] ${branch.name}: Sync chi tiết (${detailedStep}/${uniqueBranchIds.length})`;
                }
                const stats = await this.syncSingleCustomerDetail(customerId);
                sessionStats.payments += stats.payments;
                sessionStats.treatments += stats.treatments;
                sessionStats.services += stats.services;
                syncedIdsInSession.add(customerId);
                // Delay 100ms
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
              this.syncStatus.message = oldMsg;
            }
          }
        }
        this.addLog(`✅ Hoàn thành đồng bộ dữ liệu cho ngày: ${dateStr}`);
      }

      if (this.syncStatus.shouldStop) {
        throw new Error('Đồng bộ đã được dừng bởi người dùng.');
      }

      // 4. Đồng bộ PBX nếu được yêu cầu
      if (syncPbx) {
        this.syncStatus.message = 'Đang đồng bộ cuộc gọi PBX...';
        this.addLog('📞 Bắt đầu đồng bộ dữ liệu PBX (CDR)...');
        
        // Đồng bộ Extensions và Employees trước
        await this.pbxSync.syncExtensions();
        await this.pbxSync.syncPbxEmployees();
        this.addLog('✅ Đã cập nhật Extensions/Employees');

        // Đồng bộ CDR từ API chuyên dụng
        const cdrResult = await this.pbxSync.syncCdr(dateFrom, dateTo);
        this.addLog(`✅ Đã đồng bộ ${cdrResult.success} cuộc gọi PBX API (${cdrResult.failed} lỗi)`);

        // Đồng bộ Lịch sử cuộc gọi từ Portal VTTech (Mới)
        this.addLog('📞 Đang lấy lịch sử cuộc gọi từ Portal VTTech...');
        const portalCdrResult = await this.pbxSync.syncVttechCallHistory(dateFrom, dateTo);
        this.addLog(`✅ Đã đồng bộ ${portalCdrResult.success} cuộc gọi từ Portal (${portalCdrResult.failed} lỗi)`);
      }

      // 5. Đồng bộ Doanh thu chi tiết (để hiển thị bảng Dashboard)
      this.syncStatus.message = 'Đang đồng bộ giao dịch doanh thu...';
      this.addLog('💰 Bắt đầu đồng bộ giao dịch Doanh thu chi tiết...');
      try {
        await this.executeRevenueSync(dateFrom, dateTo, branches);
        this.addLog('✅ Hoàn tất đồng bộ giao dịch Doanh thu.');
      } catch (revError) {
        this.addLog(`⚠️ Lỗi khi đồng bộ doanh thu: ${revError.message}`);
      }

      this.syncStatus.progress = 100;
      this.syncStatus.message = 'Hoàn thành!';
      this.syncStatus.endTime = Date.now();
      const duration = (this.syncStatus.endTime - startTime) / 1000;
      this.addLog(`✅ Hoàn tất quá trình đồng bộ trong ${duration}s.`);

      sessionStats.customers = syncedIdsInSession.size;

      await (this.prisma.crawlLog as any).create({
        data: {
          crawl_date: this.parseDate(dateFrom) as Date,
          crawl_type: 'full_range_sync',
          status: 'success',
          records_count: syncedIdsInSession.size,
          total_branches: sessionStats.branches,
          total_customers: sessionStats.customers,
          total_payments: sessionStats.payments,
          total_treatments: sessionStats.treatments,
          total_services: sessionStats.services,
          duration_seconds: duration,
        },
      });

      this.addLog(`📊 THỐNG KÊ: ${sessionStats.branches} CN, ${sessionStats.customers} Khách, ${sessionStats.payments} P/S, ${sessionStats.treatments} Trị, ${sessionStats.services} Dịch vụ`);

    } catch (error) {
      this.syncStatus.error = error.message;
      this.syncStatus.message = 'Lỗi đồng bộ!';
      this.addLog(`❌ Lỗi: ${error.message}`);
      
      await (this.prisma.crawlLog as any).create({
        data: {
          crawl_date: this.parseDate(dateFrom) as Date,
          crawl_type: 'full_range_sync',
          status: 'error',
          error_message: error.message,
          total_branches: 0,
          total_customers: 0,
          total_payments: 0,
          total_treatments: 0,
          total_services: 0,
        },
      });
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
      const res = await this.vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
        dateFrom: `${dateFrom} 00:00:00`,
        dateTo: `${dateTo} 23:59:59`,
        branchID: branchId.toString(),
        type: type,
        BeginID: 0,
        BeginCustID: 0,
        Limit: length,
      });

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
    const res = await this.vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
      DateFrom: `${this.formatDate(dateFrom)} 00:00:00`,
      BranchID: branchId.toString(),
      AppID: '0',
      StatusID: '0',
      DoctorID: '0',
      TypeApp: '1',
    });

    const dataItems = this.ensureArray(res);

    if (dataItems.length > 0) {
      for (const a of dataItems) {
        try {
          const id = parseInt(a.ID || a.ScheduleID || a.id);
          const customerId = parseInt(a.CustomerID || a.customer_id);
          await this.prisma.appointment.upsert({
            where: { id },
            update: {
              customer_id: customerId,
              customer_name: a.CustomerName,
              phone: a.Phone,
              branch_id: parseInt(a.BranchID),
              status: parseInt(a.Status),
              appointment_date: this.parseDate(a.Date),
            },
            create: {
              id,
              customer_id: customerId,
              customer_name: a.CustomerName,
              phone: a.Phone,
              branch_id: parseInt(a.BranchID),
              status: parseInt(a.Status),
              appointment_date: this.parseDate(a.Date),
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

    this.addLog(`🔍 Đang đồng bộ chi tiết cho ${customers.length} khách hàng...`);
    
    for (let i = 0; i < customers.length; i++) {
      if (this.syncStatus.shouldStop) {
        this.addLog('🛑 Đã dừng đồng bộ chi tiết khách hàng theo yêu cầu.');
        break;
      }
      const customer = customers[i];
      if (i % 20 === 0) {
        this.syncStatus.message = `Đang đồng bộ chi tiết: ${i}/${customers.length} khách hàng`;
      }
      try {
        await this.syncSingleCustomerDetail(customer.id);
        // Delay 100ms giữa mỗi khách hàng để tránh quá tải API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        this.logger.error(`Error syncing detail for customer ${customer.id}: ${e.message}`);
      }
    }
    this.addLog('✅ Hoàn thành đồng bộ chi tiết khách hàng');
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
        return { branches: lastSync.total_branches, services: lastSync.total_services };
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

  private async syncCustomerMedicine(customerId: number) {
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
            created_at: this.parseDate(item.Created),
          },
          create: {
            customer_id: customerId,
            prescription_id: mId,
            medicine_name: item.Name,
            quantity: parseInt(item.Quantity) || 1,
            unit_name: item.UnitName || '',
            dosage: item.Dosage || '',
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

  private async syncCustomerPayments(customerId: number): Promise<number> {
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
            amount: parseFloat(p.Amount || 0) || 0, 
            payment_date: this.parseDate(p.Date || p.Created), 
            payment_method: p.MethodName || '', 
            note: p.Note || p.Content || '',
            signature_data: p.SignatureData || null
          },
          create: { 
            customer: { connect: { id: customerId } },
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

  private async syncCustomerSchedules(customerId: number): Promise<number> {
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
            status: item.IsCancel === 0 ? 1 : 2, // Simplistic mapping
            branch_name: item.Branch || '',
            employee_name: item.DoctorName || '',
          },
          create: {
            id: sId,
            customer_id: customerId,
            appointment_date: this.parseDate(item.Date_From),
            note: item.Content || '',
            status: item.IsCancel === 0 ? 1 : 2,
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

  private async syncSingleCustomerDetail(customerId: number): Promise<{ payments: number, treatments: number, services: number }> {
    this.addLog(`🔍 [ID: ${customerId}] 🚀 Bắt đầu Full Sync chi tiết...`);
    const stats = { payments: 0, treatments: 0, services: 0 };

    // 0. Update Basic Info from GeneralInfo
    await this.syncCustomerGeneralInfo(customerId);

    // 0b. Update Basic Payment Info
    try {
      const payInfo = await this.vttechApi.callHandler('/Customer/MainCustomer/', 'LoadPaymentInfo', { CustomerID: customerId });
      const payInfoItems = this.ensureArray(payInfo);
      if (payInfoItems.length > 0) {
        const info = payInfoItems[0];
        const paid = parseFloat(info.PAID || info.Paid) || 0;
        const discounted = parseFloat(info.PRICE_DISCOUNTED || info.PriceDiscounted) || 0;
        
        await this.prisma.customer.update({
          where: { id: customerId },
          data: {
            total_spent: isNaN(paid) ? 0 : paid,
            total_debt: (isNaN(discounted) ? 0 : discounted) - (isNaN(paid) ? 0 : paid),
          }
        });
        this.addLog(`   ✅ [ID: ${customerId}] Đã cập nhật Doanh thu & Công nợ`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadPaymentInfo: ${e.message}`);
    }

    // 1. Services Tab
    try {
      const services = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab', { CustomerID: customerId });
      const items = this.ensureArray(services);
      if (items.length > 0) {
        stats.services = items.length;
        for (const s of items) {
          const sId = parseInt(s.ID || s.id);
          if (!sId) continue;
          
          const rawPrice = parseFloat(s.Price);
          const price = isNaN(rawPrice) ? 0 : rawPrice;
          
          const rawQty = parseInt(s.Quantity);
          const qty = isNaN(rawQty) ? 1 : rawQty;
          
          const rawTotal = parseFloat(s.Total);
          const total = isNaN(rawTotal) ? 0 : rawTotal;

          await this.prisma.customerServiceTab.upsert({
            where: { customer_id_service_id: { customer_id: customerId, service_id: sId } },
            update: { 
              service_name: s.ServiceName || '', 
              quantity: qty, 
              price: price, 
              discount: parseFloat(s.Discount) || 0,
              total: total, 
              created_at: this.parseDate(s.Date),
              status: s.StatusName || '' 
            },
            create: { 
              customer: { connect: { id: customerId } },
              service_id: sId, 
              service_name: s.ServiceName || '', 
              quantity: qty, 
              price: price, 
              discount: parseFloat(s.Discount) || 0,
              total: total, 
              created_at: this.parseDate(s.Date),
              status: s.StatusName || '' 
            }
          });
        }
        this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Dịch vụ đang sử dụng`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab: ${e.message}`);
    }

    // 2. Payments History (Consolidated)
    stats.payments = await this.syncCustomerPayments(customerId);

    // 3. Treatment
    try {
      const treatments = await this.vttechApi.callHandler('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadataTreatment', { 
        CustomerID: customerId,
        PatientRecordID: 0,
        TreatmentPlanID: 0,
        ServiceTabID: 0,
        ServiceCatTabID: 0,
        idbegin: 0,
        idbeginless: 0,
        limit: 100
      });
      const items = this.ensureArray(treatments);
      if (items.length > 0) {
        stats.treatments = items.length;
        for (const t of items) {
          const tId = parseInt(t.ID || t.id);
          if (!tId) continue;

          await this.prisma.treatment.upsert({
            where: { id: tId },
            update: { 
              customer: { connect: { id: customerId } }, 
              customer_name: t.CustomerName || '', 
              service_name: t.ServiceName || '', 
              employee_name: t.EmployeeName || '', 
              treatment_date: this.parseDate(t.Date), 
              amount: parseFloat(t.Amount || 0) || 0 
            },
            create: { 
              id: tId, 
              customer: { connect: { id: customerId } }, 
              customer_name: t.CustomerName || '', 
              service_name: t.ServiceName || '', 
              employee_name: t.EmployeeName || '', 
              treatment_date: this.parseDate(t.Date), 
              amount: parseFloat(t.Amount || 0) || 0 
            }
          });
        }
        this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lần điều trị`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTreatment: ${e.message}`);
    }

    // 4. Care History
    try {
      const history = await this.vttechApi.callHandler('/Customer/History/HistoryList_Care/', 'LoadataHistory', { 
        CustomerID: customerId,
        Type: 0,
        Limit: 100,
        BeginID: 0
      });
      const items = this.ensureArray(history);
      if (items.length > 0) {
        for (const h of items) {
          const hId = parseInt(h.ID || h.id);
          if (!hId) continue;

          await this.prisma.customerCareHistory.upsert({
            where: { customer_id_history_id: { customer_id: customerId, history_id: hId } },
            update: { action_type: h.TypeName || '', action_date: this.parseDate(h.Date), employee_name: h.EmployeeName || '', note: h.Content || '' },
            create: { 
              customer: { connect: { id: customerId } },
              history_id: hId, 
              action_type: h.TypeName || '', 
              action_date: this.parseDate(h.Date), 
              employee_name: h.EmployeeName || '', 
              note: h.Content || '' 
            }
          });
        }
        this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử chăm sóc`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataHistory: ${e.message}`);
    }

    // 5. Installments
    try {
      const installments = await this.vttechApi.callHandler('/Customer/Installment/InstallmentList/', 'LoadDetail', { 
        CustomerID: customerId 
      });
      const items = this.ensureArray(installments);
      if (items.length > 0) {
        for (const i of items) {
          const insId = parseInt(i.ID || i.id);
          if (!insId) continue;

          await this.prisma.customerInstallment.upsert({
            where: { customer_id_installment_id: { customer_id: customerId, installment_id: insId } },
            update: { total_amount: parseFloat(i.TotalAmount || 0) || 0, paid_amount: parseFloat(i.PaidAmount || 0) || 0, remain_amount: parseFloat(i.RemainAmount || 0) || 0, created_at: this.parseDate(i.Date), note: i.Note || '' },
            create: { 
              customer: { connect: { id: customerId } },
              installment_id: insId, 
              total_amount: parseFloat(i.TotalAmount || 0) || 0, 
              paid_amount: parseFloat(i.PaidAmount || 0) || 0, 
              remain_amount: parseFloat(i.RemainAmount || 0) || 0, 
              created_at: this.parseDate(i.Date), 
              note: i.Note || '' 
            }
          });
        }
        this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Hợp đồng trả góp`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadDetail (Installment): ${e.message}`);
    }

    // 6. Complaints
    try {
      const complaints = await this.vttechApi.callHandler('/Customer/ComplaintList/', 'Loadata', { CustomerID: customerId });
      const items = this.ensureArray(complaints);
      if (items.length > 0) {
        for (const c of items) {
          const compId = parseInt(c.ID || c.id);
          if (!compId) continue;

          await this.prisma.customerComplaint.upsert({
            where: { customer_id_complaint_id: { customer_id: customerId, complaint_id: compId } },
            update: { content: c.Content || '', status_name: c.StatusName || '', created_at: this.parseDate(c.Date) },
            create: { 
              customer: { connect: { id: customerId } },
              complaint_id: compId, 
              content: c.Content || '', 
              status_name: c.StatusName || '', 
              created_at: this.parseDate(c.Date) 
            }
          });
        }
        this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Khiếu nại`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi Loadata (Complaint): ${e.message}`);
    }

    // 7. Treatment Plans
    try {
      const plans = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab_Plan', { CustomerID: customerId });
      const items = this.ensureArray(plans);
      if (items.length > 0) {
        for (const p of items) {
          const pId = parseInt(p.ID || p.id);
          if (!pId) continue;

          await this.prisma.customerTreatmentPlan.upsert({
            where: { customer_id_plan_id: { customer_id: customerId, plan_id: pId } },
            update: { service_name: p.ServiceName || '', doctor_name: p.DoctorName || '', created_at: this.parseDate(p.Date), note: p.Note || '' },
            create: { 
              customer: { connect: { id: customerId } },
              plan_id: pId, 
              service_name: p.ServiceName || '', 
              doctor_name: p.DoctorName || '', 
              created_at: this.parseDate(p.Date), 
              note: p.Note || '' 
            }
          });
        }
        this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Phác đồ điều trị`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab_Plan: ${e.message}`);
    }

    // 8. Change History
    try {
      const changeHistory = await this.vttechApi.callHandler('/Customer/MainCustomer/', 'LoadataTab_History_Change', { CustomerID: customerId });
      const items = this.ensureArray(changeHistory);
      if (items.length > 0) {
        for (const c of items) {
          const hId = parseInt(c.ID || c.id || c.CustID);
          if (!hId) continue;

          await (this.prisma as any).customerChangeHistory.upsert({
            where: { customer_id_history_id: { customer_id: customerId, history_id: hId } },
            update: { content: c.Content || '', employee_name: c.EmployeeName || '', action_date: this.parseDate(c.Date) },
            create: { 
              customer: { connect: { id: customerId } },
              history_id: hId, 
              content: c.Content || '', 
              employee_name: c.EmployeeName || '', 
              action_date: this.parseDate(c.Date) 
            }
          });
        }
        this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử thay đổi hồ sơ`);
      }
    } catch (e) {
      this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab_History_Change: ${e.message}`);
    }

    // 9. Status History
    await this.syncCustomerStatus(customerId);

    // 10. Cards
    await this.syncCustomerCards(customerId);

    // 11. Prescription Medicine
    await this.syncCustomerMedicine(customerId);

    // 12. Images
    await this.syncCustomerImages(customerId);

    // 13. Schedules (Historical)
    await this.syncCustomerSchedules(customerId);

    // 14. Anamnesis (Tiền sử)
    await this.syncCustomerAnamnesis(customerId);

    // 15. Call History from VTTech
    if (phone) {
      await this.syncCustomerVttechCalls(customerId, phone);
    }

    // 16. Marketing Tickets
    await this.syncCustomerTickets(customerId);

    // 17. SMS History
    await this.syncCustomerSms(customerId);
    
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

  private async syncCustomerTickets(customerId: number) {
    try {
      // Phỏng đoán handler cho Ticket khách hàng
      const res = await this.vttechApi.callHandler('/Marketing/TicketList/', 'Loadata', { CustomerID: customerId, Limit: 100, BeginID: 0 });
      const items = this.ensureArray(res?.Data || res?.Table || res);
      for (const item of items) {
        const tId = parseInt(item.ID);
        if (!tId) continue;
        await (this.prisma as any).customerTicket.upsert({
          where: { customer_id_ticket_id: { customer_id: customerId, ticket_id: tId } },
          update: {
            content: item.Content || item.Note,
            status_name: item.StatusName,
            employee_name: item.EmployeeName,
            created_at: this.parseDate(item.Created),
          },
          create: {
            customer_id: customerId,
            ticket_id: tId,
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

  private async syncCustomerSms(customerId: number) {
    try {
      // SMS thường nằm chung trong HistoryList_Care với Type cụ thể, hoặc API SMS riêng
      const res = await this.vttechApi.callHandler('/Marketing/Sms/History/', 'Loadata', { CustomerID: customerId, Limit: 100, BeginID: 0 });
      const items = this.ensureArray(res?.Data || res?.Table || res);
      
      for (const item of items) {
        const sId = parseInt(item.ID);
        if (!sId) continue;
        await (this.prisma as any).customerSms.upsert({
          where: { customer_id_sms_id: { customer_id: customerId, sms_id: sId } },
          update: {
            phone: item.Phone,
            content: item.Content,
            status_name: item.StatusName,
            created_at: this.parseDate(item.Created),
          },
          create: {
            customer_id: customerId,
            sms_id: sId,
            phone: item.Phone,
            content: item.Content,
            status_name: item.StatusName,
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

  async processQueuedCustomerDetail(customerId: number) {
    this.logger.log(`Worker processing customer detail: ${customerId}`);
    try {
      await this.vttechApi.login();
      await this.vttechApi.getXsrfToken();
      return await this.syncSingleCustomerDetail(customerId);
    } catch (error) {
      this.logger.error(`Error in processQueuedCustomerDetail: ${error.message}`);
      throw error;
    }
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private mapRevenueItem(item: any, branchId: number) {
    return {
      branch_id: branchId,
      customer_id: parseInt(item.CustomerID) || 0,
      customer_name: item.CustomerName || "N/A",
      customer_code: item.CustomerCode || "",
      amount: parseFloat(item.Amount) || 0,
      payment_method: parseInt(item.PaymentMethod) || 0,
      service_name: item.ServiceName || "",
      content: item.Content || "",
      employee_name: item.EmployeeName || "",
      date: this.parseDate(item.Date) || new Date(),
    };
  }

  async processQueuedRevenueDay(date: string, branchId: number) {
    this.logger.log(`Worker processing revenue day: ${date}, branch: ${branchId}`);
    try {
      await this.vttechApi.login();
      await this.vttechApi.getXsrfToken();
      
      const res = await this.vttechApi.getRevenueByBranch(date, date, branchId);
      const items = this.ensureArray(res);
      
      for (const item of items) {
        // Implement Checksum here
        const currentHash = this.generateHash(item);
        const existing = await this.prisma.revenueTransaction.findUnique({
          where: { id: parseInt(item.ID) }
        });

        if (existing && existing.last_hash === currentHash) {
          continue; // Skip if same data
        }

        const mapped = this.mapRevenueItem(item, branchId);

        await this.prisma.revenueTransaction.upsert({
          where: { id: parseInt(item.ID) },
          update: {
            ...mapped,
            last_hash: currentHash,
          },
          create: {
            ...mapped,
            id: parseInt(item.ID),
            created_at: new Date(), // Add required field
            last_hash: currentHash,
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error in processQueuedRevenueDay: ${error.message}`);
      throw error;
    }
  }
}
