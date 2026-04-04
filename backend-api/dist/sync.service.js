"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const CryptoJS = __importStar(require("crypto-js"));
const vttech_api_service_1 = require("./vttech-api.service");
const prisma_service_1 = require("./prisma.service");
const pbx_sync_service_1 = require("./pbx-sync.service");
let SyncService = SyncService_1 = class SyncService {
    vttechApi;
    prisma;
    pbxSync;
    syncQueue;
    logger = new common_1.Logger(SyncService_1.name);
    syncStatus = {
        isSyncing: false,
        progress: 0,
        total: 0,
        current: 0,
        message: '',
        logs: [],
        startTime: null,
        endTime: null,
        error: null,
        shouldStop: false,
    };
    constructor(vttechApi, prisma, pbxSync, syncQueue) {
        this.vttechApi = vttechApi;
        this.prisma = prisma;
        this.pbxSync = pbxSync;
        this.syncQueue = syncQueue;
    }
    async onModuleInit() {
        this.logger.log('🚀 [STARTUP] Đang kiểm tra kết nối API VTTech...');
        this.vttechApi.checkLoginStatus().then(result => {
            if (result.success) {
                this.logger.log(`✅ [LOGIN OK] Người dùng: ${result.user}`);
                this.logger.log(`✅ [STATUS] ${result.message}`);
            }
            else {
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
    addLog(message) {
        const log = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.syncStatus.logs.push(log);
        this.logger.log(message);
        if (this.syncStatus.logs.length > 500) {
            this.syncStatus.logs.shift();
        }
    }
    ensureArray(res) {
        if (!res)
            return [];
        if (Array.isArray(res))
            return res;
        if (typeof res !== 'object')
            return [];
        const possible = res.Table || res.data || res.Data || res.Items || res.Table1;
        if (Array.isArray(possible))
            return possible;
        const target = possible || res;
        const keys = Object.keys(target);
        if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
            return Object.values(target);
        }
        return [];
    }
    parseDate(dateValue) {
        if (!dateValue)
            return null;
        if (dateValue instanceof Date)
            return dateValue;
        const s = String(dateValue).trim();
        if (!s)
            return null;
        const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
        const match = s.match(ddmmyyyy);
        if (match) {
            const d = parseInt(match[1]);
            const m = parseInt(match[2]);
            const y = parseInt(match[3]);
            const date = new Date(y, m - 1, d, 12, 0, 0);
            return isNaN(date.getTime()) ? null : date;
        }
        const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
        const match2 = s.match(yyyymmdd);
        if (match2) {
            const y = parseInt(match2[1]);
            const m = parseInt(match2[2]);
            const d = parseInt(match2[3]);
            const date = new Date(y, m - 1, d, 12, 0, 0);
            return isNaN(date.getTime()) ? null : date;
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }
    formatDate(date) {
        if (!date)
            return '';
        let d;
        if (date instanceof Date) {
            d = date;
        }
        else {
            d = new Date(date);
        }
        if (isNaN(d.getTime()))
            return String(date).replace(/-/g, '/');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    async handleDailySync() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        await this.syncByRange(dateStr, dateStr);
    }
    async syncRevenue(dateFrom, dateTo) {
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
        }
        catch (error) {
            this.syncStatus.error = error.message;
            this.addLog(`❌ Lỗi đồng bộ doanh thu: ${error.message}`);
        }
        finally {
            this.syncStatus.isSyncing = false;
        }
    }
    async executeRevenueSync(dateFrom, dateTo, branches) {
        const start = this.parseDate(dateFrom);
        const end = this.parseDate(dateTo);
        if (!start || !end)
            throw new Error('Ngày không hợp lệ');
        const days = [];
        let currentDay = new Date(start);
        while (currentDay <= end) {
            days.push(currentDay.toISOString().split('T')[0]);
            currentDay.setDate(currentDay.getDate() + 1);
        }
        const totalSteps = days.length * branches.length;
        let currentStep = 0;
        const syncedCustomerIds = new Set();
        for (const dateStr of days) {
            if (this.syncStatus.shouldStop)
                break;
            this.addLog(`📅 Ngày Doanh thu: ${dateStr}`);
            for (const branch of branches) {
                if (this.syncStatus.shouldStop)
                    break;
                currentStep++;
                try {
                    await this.syncQueue.add('sync-job', {
                        type: 'sync-revenue-day',
                        data: { date: dateStr, branchId: branch.id }
                    }, {
                        backoff: { type: 'exponential', delay: 1000 },
                        attempts: 3,
                    });
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
                }
                catch (e) {
                    this.addLog(`  ❌ [${branch.name}] Lỗi khi đẩy Job doanh thu: ${e.message}`);
                }
            }
        }
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
    async syncByRange(dateFrom, dateTo, forceMaster = false, syncPbx = false, syncDetails = true) {
        if (this.syncStatus.isSyncing) {
            throw new Error('Một quy trình đồng bộ khác đang chạy.');
        }
        const startTime = Date.now();
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
            this.vttechApi.setLogCallback((msg) => this.addLog(msg));
            this.syncStatus.message = 'Đang đăng nhập VTTech...';
            const loggedIn = await this.vttechApi.login();
            if (!loggedIn)
                throw new Error('Đăng nhập thất bại');
            this.syncStatus.message = 'Đang lấy XSRF Token...';
            await this.vttechApi.getXsrfToken();
            await this.syncMasterData(forceMaster);
            const branches = await this.prisma.branch.findMany({ where: { is_active: 1 } });
            this.syncStatus.total = branches.length;
            const start = this.parseDate(dateFrom);
            const end = this.parseDate(dateTo);
            if (!start || !end) {
                throw new Error(`Khoảng thời gian không hợp lệ: ${dateFrom} - ${dateTo}`);
            }
            const days = [];
            let currentDay = new Date(start);
            while (currentDay <= end) {
                days.push(currentDay.toISOString().split('T')[0]);
                currentDay.setDate(currentDay.getDate() + 1);
            }
            const syncedIdsInSession = new Set();
            const totalSteps = days.length * branches.length;
            let currentStep = 0;
            const sessionStats = {
                branches: branches.length,
                customers: 0,
                payments: 0,
                treatments: 0,
                services: 0,
            };
            for (const dateStr of days) {
                this.addLog(`📅 --- Bắt đầu đồng bộ ngày: ${dateStr} ---`);
                for (let i = 0; i < branches.length; i++) {
                    if (this.syncStatus.shouldStop)
                        break;
                    currentStep++;
                    const branch = branches[i];
                    this.syncStatus.message = `Đang đồng bộ ${dateStr} (${currentStep}/${totalSteps}): ${branch.name}`;
                    this.syncStatus.progress = Math.round((currentStep / totalSteps) * 90);
                    const branchCustomerIds = [];
                    this.addLog(`  👥 [${branch.name}] Tìm khách hàng mới/giao dịch/lịch sử...`);
                    try {
                        branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 5, branch.id));
                        await this.sleep(1000);
                        branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 2, branch.id));
                        await this.sleep(1000);
                        branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 3, branch.id));
                        await this.sleep(2000);
                    }
                    catch (e) {
                        this.addLog(`  ❌ [${branch.name}] Lỗi khi lấy danh sách khách hàng: ${e.message}`);
                    }
                    try {
                        const appointmentIds = await this.syncAppointments(dateStr, dateStr, branch.id);
                        branchCustomerIds.push(...appointmentIds);
                    }
                    catch (e) {
                        this.addLog(`  ❌ [${branch.name}] Lỗi khi lấy lịch hẹn: ${e.message}`);
                    }
                    if (syncDetails) {
                        const uniqueBranchIds = [...new Set(branchCustomerIds)].filter(id => !syncedIdsInSession.has(id));
                        if (uniqueBranchIds.length > 0) {
                            const oldMsg = this.syncStatus.message;
                            let detailedStep = 0;
                            for (const customerId of uniqueBranchIds) {
                                if (this.syncStatus.shouldStop)
                                    break;
                                detailedStep++;
                                if (detailedStep % 5 === 0) {
                                    this.syncStatus.message = `[${dateStr}] ${branch.name}: Sync chi tiết (${detailedStep}/${uniqueBranchIds.length})`;
                                }
                                try {
                                    const stats = await this.syncSingleCustomerDetail(customerId);
                                    sessionStats.payments += stats.payments;
                                    sessionStats.treatments += stats.treatments;
                                    sessionStats.services += stats.services;
                                    syncedIdsInSession.add(customerId);
                                }
                                catch (e) {
                                    this.addLog(`  ❌ [ID: ${customerId}] Lỗi FULL sync: ${e.message}`);
                                }
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
            if (syncPbx) {
                this.syncStatus.message = 'Đang đồng bộ cuộc gọi PBX...';
                this.addLog('📞 Bắt đầu đồng bộ dữ liệu PBX (CDR)...');
                await this.pbxSync.syncExtensions();
                await this.pbxSync.syncPbxEmployees();
                this.addLog('✅ Đã cập nhật Extensions/Employees');
                const cdrResult = await this.pbxSync.syncCdr(dateFrom, dateTo);
                this.addLog(`✅ Đã đồng bộ ${cdrResult.success} cuộc gọi PBX API (${cdrResult.failed} lỗi)`);
                this.addLog('📞 Đang lấy lịch sử cuộc gọi từ Portal VTTech...');
                const portalCdrResult = await this.pbxSync.syncVttechCallHistory(dateFrom, dateTo);
                this.addLog(`✅ Đã đồng bộ ${portalCdrResult.success} cuộc gọi từ Portal (${portalCdrResult.failed} lỗi)`);
            }
            this.syncStatus.message = 'Đang đồng bộ giao dịch doanh thu...';
            this.addLog('💰 Bắt đầu đồng bộ giao dịch Doanh thu chi tiết...');
            try {
                await this.executeRevenueSync(dateFrom, dateTo, branches);
                this.addLog('✅ Hoàn tất đồng bộ giao dịch Doanh thu.');
            }
            catch (revError) {
                this.addLog(`⚠️ Lỗi khi đồng bộ doanh thu: ${revError.message}`);
            }
            this.syncStatus.progress = 100;
            this.syncStatus.message = 'Hoàn thành!';
            this.syncStatus.endTime = Date.now();
            const duration = (this.syncStatus.endTime - startTime) / 1000;
            this.addLog(`✅ Hoàn tất quá trình đồng bộ trong ${duration}s.`);
            sessionStats.customers = syncedIdsInSession.size;
            await this.prisma.crawlLog.create({
                data: {
                    crawl_date: this.parseDate(dateFrom),
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
        }
        catch (error) {
            this.syncStatus.error = error.message;
            this.syncStatus.message = 'Lỗi đồng bộ!';
            this.addLog(`❌ Lỗi: ${error.message}`);
            await this.prisma.crawlLog.create({
                data: {
                    crawl_date: this.parseDate(dateFrom),
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
        }
        finally {
            this.syncStatus.isSyncing = false;
        }
    }
    async syncByDate(dateStr) {
        return this.syncByRange(dateStr, dateStr);
    }
    async syncCustomers(dateFrom, dateTo, type = 1, branchId = 0) {
        let start = 0;
        const length = 100;
        let hasMore = true;
        const customerIds = [];
        while (hasMore) {
            if (this.syncStatus.shouldStop)
                break;
            let res = null;
            try {
                res = await this.vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
                    dateFrom: `${this.formatDate(dateFrom)} 00:00:00`,
                    dateTo: `${this.formatDate(dateTo)} 23:59:59`,
                    branchID: branchId.toString(),
                    type: type,
                    BeginID: 0,
                    BeginCustID: 0,
                    Limit: length,
                });
            }
            catch (e) {
                this.addLog(`   ❌ [SyncCustomers] Lỗi API (Type ${type}): ${e.message}`);
                hasMore = false;
                break;
            }
            const dataItems = this.ensureArray(res);
            if (dataItems.length > 0) {
                this.addLog(`  📥 Nhận được ${dataItems.length} khách hàng từ bản ghi thứ ${start} (Type: ${type})`);
                for (const c of dataItems) {
                    try {
                        const id = parseInt(c.CustID || c.ID || c.id);
                        if (!id)
                            continue;
                        const name = c.CustName || c.FullName || c.Name || 'Unknown';
                        const phone = c.Phone || c.Mobile || '';
                        const email = c.Email || c.Email1 || '';
                        const paid = parseFloat(c.TotalPaid || c.Amount || c.TotalAmount || 0);
                        let debt = 0;
                        if (c.TotalRaise !== undefined && c.TotalPaid !== undefined) {
                            debt = parseFloat(c.TotalRaise) - parseFloat(c.TotalPaid);
                        }
                        else {
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
                        await this.prisma.dailyCustomer.upsert({
                            where: { date_customer_id: { date: this.parseDate(dateFrom), customer_id: id } },
                            update: { branch_id: branchIdFromData, customer_name: name, phone: phone },
                            create: {
                                date: this.parseDate(dateFrom),
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
                    }
                    catch (e) {
                        this.addLog(`❌ [ID: ${c.CustID || c.ID}] Lỗi upsert khách hàng: ${e.message}`);
                    }
                }
                start += length;
                if (dataItems.length < length)
                    hasMore = false;
            }
            else {
                hasMore = false;
            }
        }
        return customerIds;
    }
    async syncAppointments(dateFrom, dateTo, branchId = 0) {
        const customerIds = [];
        const formatDateMMDDYYYY = (date) => {
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${month}/${day}/${year}`;
        };
        let res = null;
        try {
            res = await this.vttechApi.callHandler('/Desk/Appointment/AppointmentInDay_Desk_Branch/', 'LoadataAppointmentList', {
                DateFrom: `${formatDateMMDDYYYY(dateFrom)} 00:00:00`,
                BranchID: branchId.toString(),
                AppID: '0',
                StatusID: '0',
                DoctorID: '0',
                TypeApp: '1',
            });
        }
        catch (e) {
            this.addLog(`   ❌ [SyncAppointments] Lỗi API: ${e.message}`);
            return [];
        }
        const dataItems = this.ensureArray(res);
        if (dataItems.length > 0) {
            for (const a of dataItems) {
                try {
                    const id = parseInt(a.ID || a.ScheduleID || a.id || a.AppID);
                    const customerId = parseInt(a.CustomerID || a.customer_id || a.CustID);
                    if (!id)
                        continue;
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
                    if (customerId)
                        customerIds.push(customerId);
                }
                catch (e) { }
            }
        }
        return customerIds;
    }
    async syncAllCustomerDetails(dateFrom, dateTo, ids) {
        let customers = [];
        if (ids && ids.length > 0) {
            const uniqueIds = [...new Set(ids)];
            customers = uniqueIds.map(id => ({ id }));
        }
        else {
            const dFrom = this.parseDate(dateFrom);
            const dTo = this.parseDate(dateTo);
            if (!dFrom || !dTo) {
                this.addLog(`⏩ Bỏ qua bước này do ngày không hợp lệ: ${dateFrom} - ${dateTo}`);
                return;
            }
            const appointmentIds = await this.prisma.appointment.findMany({
                where: {
                    appointment_date: {
                        gte: new Date(new Date(dFrom).setHours(0, 0, 0, 0)),
                        lte: new Date(new Date(dTo).setHours(23, 59, 59, 999)),
                    }
                },
                select: { customer_id: true }
            });
            const uniqueIds = [...new Set(appointmentIds.map(a => a.customer_id).filter((id) => id !== null))];
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
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (e) {
                this.logger.error(`Error syncing detail for customer ${customer.id}: ${e.message}`);
            }
        }
        this.addLog('✅ Hoàn thành đồng bộ chi tiết khách hàng');
    }
    async syncMasterData(force = false) {
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
        let result = {};
        try {
            result = await this.vttechApi.callApi('/api/Home/SessionData', {});
        }
        catch (e) {
            this.addLog(`⚠️ Cảnh báo: Không thể lấy SessionData (/api/Home/SessionData): ${e.message}. Sẽ thử các nguồn khác...`);
        }
        if (!result) {
            this.addLog('⚠️ Không lấy được SessionData');
            return stats;
        }
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
    async syncCustomerStatus(customerId) {
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
                if (!hId)
                    continue;
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
            if (items.length > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử trạng thái`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerStatus: ${e.message}`);
        }
    }
    async syncCustomerGeneralInfo(customerId) {
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
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerGeneralInfo: ${e.message}`);
        }
    }
    async syncCustomerCards(customerId) {
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
                if (!cardId)
                    continue;
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
                const cardLogs = allLogs.filter(l => parseInt(l.CardID) === cardId);
                for (const l of cardLogs) {
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
            if (cards.length > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${cards.length} Thẻ tài khoản & Lịch sử sử dụng`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerCards: ${e.message}`);
        }
    }
    async syncCustomerMedicine(customerId, branchId = 0) {
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
                if (!mId)
                    continue;
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
            if (items.length > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Đơn thuốc/Sản phẩm`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerMedicine: ${e.message}`);
        }
    }
    async syncCustomerImages(customerId) {
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
                    if (!img.CloudID)
                        continue;
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
            if (folders.length > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${folders.length} Thư mục ảnh`);
        }
        catch (error) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerImages: ${error.message}`);
        }
    }
    async syncCustomerPayments(customerId, branchId = 0) {
        let total = 0;
        try {
            const servicePayments = await this.vttechApi.callHandler('/Customer/Payment/PaymentList/PaymentList_Service/', 'LoadataPayment', { CustomerID: customerId });
            const sItems = this.ensureArray(servicePayments);
            for (const p of sItems) {
                const pId = parseInt(p.ID || p.id);
                if (!pId)
                    continue;
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
            const cardPayments = await this.vttechApi.callHandler('/Customer/Payment/PaymentList/PaymentList_Card/', 'LoadataPaymentCard', {
                CustomerID: customerId,
                id: 0,
                limit: 100,
                beginID: 0
            });
            const cItems = this.ensureArray(cardPayments);
            for (const p of cItems) {
                const pId = parseInt(p.ID || p.id);
                if (!pId)
                    continue;
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
            if (total > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${total} Lịch sử thanh toán (Dịch vụ & Thẻ)`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerPayments: ${e.message}`);
        }
        return total;
    }
    async syncCustomerSchedules(customerId, branchId = 0) {
        let total = 0;
        try {
            const res = await this.vttechApi.callHandler('/Customer/ScheduleList_Schedule/', 'Loadata', { CustomerID: customerId, IsCancel: 1 });
            const items = this.ensureArray(res);
            for (const item of items) {
                const sId = parseInt(item.ID);
                if (!sId)
                    continue;
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
            if (total > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${total} Lịch hẹn từ ScheduleList`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerSchedules: ${e.message}`);
        }
        return total;
    }
    async syncSingleCustomerDetail(customerId) {
        this.addLog(`🔍 [ID: ${customerId}] 🚀 Bắt đầu Full Sync chi tiết...`);
        const stats = { payments: 0, treatments: 0, services: 0 };
        await this.syncCustomerGeneralInfo(customerId);
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
            select: { branch_id: true, phone: true }
        });
        const branchId = customer?.branch_id || 0;
        try {
            const payInfo = await this.vttechApi.callHandler('/Customer/MainCustomer/', 'LoadPaymentInfo', { CustomerID: customerId });
            const payInfoItems = this.ensureArray(payInfo);
            if (payInfoItems.length > 0) {
                const info = payInfoItems[0];
                const paid = this.parseNumber(info.PAID || info.Paid);
                const discounted = this.parseNumber(info.PRICE_DISCOUNTED || info.PriceDiscounted);
                await this.prisma.customer.update({
                    where: { id: customerId },
                    data: {
                        total_spent: paid,
                        total_debt: discounted - paid,
                    }
                });
                this.addLog(`   ✅ [ID: ${customerId}] Đã cập nhật Doanh thu & Công nợ`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadPaymentInfo: ${e.message}`);
        }
        try {
            const services = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab', { CustomerID: customerId });
            const items = this.ensureArray(services);
            if (items.length > 0) {
                stats.services = items.length;
                for (const s of items) {
                    const sId = parseInt(s.ID || s.id);
                    if (!sId)
                        continue;
                    const price = this.parseNumber(s.Price);
                    const qty = parseInt(s.Quantity) || 1;
                    const total = this.parseNumber(s.Total);
                    const discount = this.parseNumber(s.Discount);
                    await this.prisma.customerServiceTab.upsert({
                        where: { customer_id_service_id: { customer_id: customerId, service_id: sId } },
                        update: {
                            service_name: s.ServiceName || '',
                            quantity: qty,
                            price: price,
                            discount: discount,
                            total: total,
                            branch_id: branchId || parseInt(s.BranchID) || null,
                            created_at: this.parseDate(s.Date),
                            status: s.StatusName || ''
                        },
                        create: {
                            customer_id: customerId,
                            service_id: sId,
                            service_name: s.ServiceName || '',
                            quantity: qty,
                            price: price,
                            discount: discount,
                            total: total,
                            branch_id: branchId || parseInt(s.BranchID) || null,
                            created_at: this.parseDate(s.Date),
                            status: s.StatusName || ''
                        }
                    });
                }
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Dịch vụ đang sử dụng`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab: ${e.message}`);
        }
        stats.payments = await this.syncCustomerPayments(customerId, branchId);
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
                    if (!tId)
                        continue;
                    await this.prisma.treatment.upsert({
                        where: { id: tId },
                        update: {
                            customer_id: customerId,
                            customer_name: t.CustomerName || t.CustName || t.CustName_Non || '',
                            service_name: String(t.ServiceName || t.Service || ''),
                            employee_name: t.EmployeeName || t.DoctorName || '',
                            treatment_date: this.parseDate(t.Date || t.Date_Treatment || t.DateTreatment || t.Created || t.TreatmentDate) || new Date(),
                            amount: this.parseNumber(t.Amount || t.TotalAmount),
                            branch_id: branchId || parseInt(t.BranchID || t.branch_id || t.BranchId) || undefined
                        },
                        create: {
                            id: tId,
                            customer_id: customerId,
                            customer_name: t.CustomerName || t.CustName || t.CustName_Non || '',
                            service_name: String(t.ServiceName || t.Service || ''),
                            employee_name: t.EmployeeName || t.DoctorName || '',
                            treatment_date: this.parseDate(t.Date || t.Date_Treatment || t.DateTreatment || t.Created || t.TreatmentDate) || new Date(),
                            amount: this.parseNumber(t.Amount || t.TotalAmount),
                            branch_id: branchId || parseInt(t.BranchID || t.branch_id || t.BranchId) || undefined
                        }
                    });
                }
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lần điều trị`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTreatment: ${e.message}`);
        }
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
                    if (!hId)
                        continue;
                    await this.prisma.customerCareHistory.upsert({
                        where: { customer_id_history_id: { customer_id: customerId, history_id: hId } },
                        update: {
                            action_type: h.TypeName || '',
                            action_date: this.parseDate(h.Date || h.Created || h.CareDate),
                            employee_name: h.EmployeeName || '',
                            note: h.Content || '',
                            branch_id: branchId || parseInt(h.BranchID) || undefined
                        },
                        create: {
                            customer_id: customerId,
                            history_id: hId,
                            action_type: h.TypeName || '',
                            action_date: this.parseDate(h.Date || h.Created || h.CareDate),
                            employee_name: h.EmployeeName || '',
                            note: h.Content || '',
                            branch_id: branchId || parseInt(h.BranchID) || undefined
                        }
                    });
                }
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử chăm sóc`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataHistory: ${e.message}`);
        }
        try {
            const installments = await this.vttechApi.callHandler('/Customer/Installment/InstallmentList/', 'LoadDetail', {
                CustomerID: customerId
            });
            const items = this.ensureArray(installments);
            if (items.length > 0) {
                for (const i of items) {
                    const insId = parseInt(i.ID || i.id);
                    if (!insId)
                        continue;
                    await this.prisma.customerInstallment.upsert({
                        where: { customer_id_installment_id: { customer_id: customerId, installment_id: insId } },
                        update: { total_amount: parseFloat(i.TotalAmount || 0) || 0, paid_amount: parseFloat(i.PaidAmount || 0) || 0, remain_amount: parseFloat(i.RemainAmount || 0) || 0, created_at: this.parseDate(i.Date), note: i.Note || '', branch_id: branchId || undefined },
                        create: {
                            customer_id: customerId,
                            installment_id: insId,
                            branch_id: branchId || undefined,
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
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadDetail (Installment): ${e.message}`);
        }
        try {
            const complaints = await this.vttechApi.callHandler('/Customer/ComplaintList/', 'Loadata', { CustomerID: customerId });
            const items = this.ensureArray(complaints);
            if (items.length > 0) {
                for (const c of items) {
                    const compId = parseInt(c.ID || c.id);
                    if (!compId)
                        continue;
                    await this.prisma.customerComplaint.upsert({
                        where: { customer_id_complaint_id: { customer_id: customerId, complaint_id: compId } },
                        update: { content: c.Content || '', status_name: c.StatusName || '', created_at: this.parseDate(c.Date), branch_id: branchId || undefined },
                        create: {
                            customer_id: customerId,
                            complaint_id: compId,
                            branch_id: branchId || undefined,
                            content: c.Content || '',
                            status_name: c.StatusName || '',
                            created_at: this.parseDate(c.Date)
                        }
                    });
                }
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Khiếu nại`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi Loadata (Complaint): ${e.message}`);
        }
        try {
            const plans = await this.vttechApi.callHandler('/Customer/Service/TabList/TabList_Service/', 'LoadataTab_Plan', { CustomerID: customerId });
            const items = this.ensureArray(plans);
            if (items.length > 0) {
                for (const p of items) {
                    const pId = parseInt(p.ID || p.id);
                    if (!pId)
                        continue;
                    await this.prisma.customerTreatmentPlan.upsert({
                        where: { customer_id_plan_id: { customer_id: customerId, plan_id: pId } },
                        update: {
                            service_name: p.ServiceName || '',
                            doctor_name: p.DoctorName || '',
                            created_at: this.parseDate(p.Date),
                            note: p.Note || '',
                            branch_id: branchId || parseInt(p.BranchID) || undefined
                        },
                        create: {
                            customer_id: customerId,
                            plan_id: pId,
                            service_name: p.ServiceName || '',
                            doctor_name: p.DoctorName || '',
                            created_at: this.parseDate(p.Date),
                            note: p.Note || '',
                            branch_id: branchId || parseInt(p.BranchID) || undefined
                        }
                    });
                }
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Phác đồ điều trị`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab_Plan: ${e.message}`);
        }
        try {
            const changeHistory = await this.vttechApi.callHandler('/Customer/MainCustomer/', 'LoadataTab_History_Change', { CustomerID: customerId });
            const items = this.ensureArray(changeHistory);
            if (items.length > 0) {
                for (const c of items) {
                    const hId = parseInt(c.ID || c.id || c.CustID);
                    if (!hId)
                        continue;
                    await this.prisma.customerChangeHistory.upsert({
                        where: { customer_id_history_id: { customer_id: customerId, history_id: hId } },
                        update: { content: c.Content || '', employee_name: c.EmployeeName || '', action_date: this.parseDate(c.Date), branch_id: branchId || undefined },
                        create: {
                            customer_id: customerId,
                            history_id: hId,
                            branch_id: branchId || undefined,
                            content: c.Content || '',
                            employee_name: c.EmployeeName || '',
                            action_date: this.parseDate(c.Date)
                        }
                    });
                }
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử thay đổi hồ sơ`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab_History_Change: ${e.message}`);
        }
        await this.syncCustomerStatus(customerId);
        await this.syncCustomerCards(customerId);
        await this.syncCustomerMedicine(customerId, branchId);
        await this.syncCustomerImages(customerId);
        await this.syncCustomerSchedules(customerId, branchId);
        await this.syncCustomerAnamnesis(customerId);
        const phone = customer?.phone;
        if (phone) {
            await this.syncCustomerVttechCalls(customerId, phone);
        }
        await this.syncCustomerTickets(customerId, branchId);
        await this.syncCustomerSms(customerId, branchId);
        this.addLog(`✅ [ID: ${customerId}] Kết thúc Full Sync.`);
        return stats;
    }
    async syncCustomerAnamnesis(customerId) {
        try {
            const res = await this.vttechApi.callHandler('/Customer/Anamnesis/CustomerAnamnesisList/', 'LoadataPatientHistory', { CustomerID: customerId });
            const items = this.ensureArray(res);
            for (const item of items) {
                const id = parseInt(item.ID);
                if (!id)
                    continue;
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
            if (items.length > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Tiền sử (Anamnesis)`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerAnamnesis: ${e.message}`);
        }
    }
    async syncCustomerVttechCalls(customerId, phone) {
        try {
            if (!phone || phone.length < 9)
                return;
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
                if (!call.uuid)
                    continue;
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
                        content: call.direction,
                        employee_name: call.caller_id_number || call.outbound_caller_id_number,
                        created_at: call.start_time
                    }
                });
            }
            if (pbxCalls.length > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã map ${pbxCalls.length} Cuộc gọi PBX vào hồ sơ Khách hàng`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerVttechCalls: ${e.message}`);
        }
    }
    async syncCustomerTickets(customerId, branchId = 0) {
        try {
            const res = await this.vttechApi.callHandler('/Marketing/TicketList/', 'Loadata', { CustomerID: customerId, Limit: 100, BeginID: 0 });
            const items = this.ensureArray(res?.Data || res?.Table || res);
            for (const item of items) {
                const tId = parseInt(item.ID);
                if (!tId)
                    continue;
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
            if (items.length > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Ticket Marketing`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerTickets: ${e.message}`);
        }
    }
    async syncCustomerSms(customerId, branchId = 0) {
        try {
            const res = await this.vttechApi.callHandler('/Marketing/Sms/History/', 'Loadata', { CustomerID: customerId, Limit: 100, BeginID: 0 });
            const items = this.ensureArray(res?.Data || res?.Table || res);
            for (const item of items) {
                const sId = parseInt(item.ID);
                if (!sId)
                    continue;
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
            if (items.length > 0)
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Tin nhắn SMS`);
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi syncCustomerSms: ${e.message}`);
        }
    }
    async getLogs(limit = 100) {
        return this.prisma.crawlLog.findMany({
            take: limit,
            orderBy: { created_at: 'desc' },
        });
    }
    generateHash(data) {
        return CryptoJS.MD5(JSON.stringify(data)).toString();
    }
    async processQueuedCustomerDetail(customerId) {
        this.logger.log(`Worker processing customer detail: ${customerId}`);
        try {
            await this.vttechApi.login();
            await this.vttechApi.getXsrfToken();
            return await this.syncSingleCustomerDetail(customerId);
        }
        catch (error) {
            this.logger.error(`Error in processQueuedCustomerDetail: ${error.message}`);
            throw error;
        }
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    parseNumber(val) {
        if (val === null || val === undefined || val === '')
            return 0;
        if (typeof val === 'number')
            return val;
        const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
        const num = parseFloat(cleanStr);
        return isNaN(num) ? 0 : num;
    }
    mapRevenueItem(item, branchId) {
        const rawAmount = item.Amount || item.AmountPaid || item.PaidAmount || item.Price || item.Price_Root || item.PaymentDeposit || item.TotalPaid || 0;
        const rawPaid = item.Paid || item.PaidAmount || item.TotalPaid || item.AmountPaid || item.PaymentDeposit || item.Amount || 0;
        const amount = this.parseNumber(rawAmount);
        const paid = this.parseNumber(rawPaid);
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
            is_new: parseInt(String(item.IsNew)) || 0,
            doc_code: String(item.DocCode || ""),
            source_id: parseInt(String(item.Source || item.SourceID)) || 0,
            type: parseInt(String(item.Type || item.TypeID)) || 0,
            payment_method: parseInt(String(item.PaymentMethod || item.MethodID)) || 0,
            date: this.parseDate(item.Date || item.Created || item.Date_Payment || item.DateCreated || item.ChooseDate) || new Date(),
        };
    }
    async processQueuedRevenueDay(date, branchId) {
        this.logger.log(`Worker processing revenue day: ${date}, branch: ${branchId}`);
        try {
            await this.vttechApi.login();
            await this.vttechApi.getXsrfToken();
            const res = await this.vttechApi.getRevenueByBranch(this.formatDate(date), this.formatDate(date), branchId);
            const items = this.ensureArray(res);
            for (const item of items) {
                const tId = parseInt(item.ID || item.id || item.PaymentID || item.OrderID || item.TabID);
                if (!tId)
                    continue;
                const currentHash = this.generateHash(item);
                const existing = await this.prisma.revenueTransaction.findUnique({
                    where: { id: tId }
                });
                if (existing && existing.last_hash === currentHash) {
                    continue;
                }
                const mapped = this.mapRevenueItem(item, branchId);
                await this.prisma.revenueTransaction.upsert({
                    where: { id: tId },
                    update: {
                        ...mapped,
                        last_hash: currentHash,
                    },
                    create: {
                        ...mapped,
                        id: tId,
                        created_at: new Date(),
                        last_hash: currentHash,
                    }
                });
            }
        }
        catch (error) {
            const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
            this.logger.error(`Error in processQueuedRevenueDay: ${errorMsg}`);
            throw error;
        }
    }
    async seedSyncTasks(startDateStr, endDateStr) {
        const start = this.parseDate(startDateStr);
        const end = this.parseDate(endDateStr);
        if (!start || !end)
            throw new Error('Ngày không hợp lệ');
        const branches = await this.prisma.branch.findMany({ where: { is_active: 1 } });
        this.addLog(`🌱 Đang khởi tạo SyncTasks cho ${branches.length} chi nhánh từ ${startDateStr} đến ${endDateStr}...`);
        let currentDay = new Date(start);
        let createdCount = 0;
        let skippedCount = 0;
        const types = ['HEADER'];
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
                    }
                    catch (e) {
                        skippedCount++;
                    }
                }
            }
            currentDay.setDate(currentDay.getDate() + 1);
        }
        this.addLog(`✅ Đã khởi tạo xong: ${createdCount} task mới, ${skippedCount} bản ghi đã tồn tại.`);
        return { created: createdCount, skipped: skippedCount };
    }
    async pushPendingTasksToQueue(limit = 1000) {
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
    async processQueuedSyncTask(taskId) {
        const task = await this.prisma.syncTask.findUnique({ where: { id: taskId } });
        if (!task)
            return;
        this.logger.log(`[TASK ${taskId}] Processing ${task.type} for branch ${task.branch_id} on ${task.date.toISOString().split('T')[0]}`);
        try {
            await this.vttechApi.login();
            await this.vttechApi.getXsrfToken();
            const dateStr = task.date.toISOString().split('T')[0];
            let totalRecords = 0;
            if (task.type === 'HEADER') {
                const typesToSync = [5, 2, 3];
                for (const type of typesToSync) {
                    const ids = await this.syncCustomers(dateStr, dateStr, type, task.branch_id);
                    totalRecords += ids.length;
                    await this.sleep(500);
                }
                const appointmentIds = await this.syncAppointments(dateStr, dateStr, task.branch_id);
                totalRecords += appointmentIds.length;
            }
            await this.prisma.syncTask.update({
                where: { id: taskId },
                data: {
                    status: 'SUCCESS',
                    records_count: totalRecords,
                    error_message: null,
                    updated_at: new Date(),
                }
            });
            await this.prisma.crawlLog.create({
                data: {
                    crawl_date: task.date,
                    crawl_type: `SYNC_TASK_${task.type}_B${task.branch_id}`,
                    status: 'success',
                    records_count: totalRecords,
                    duration_seconds: task.last_run_at ? (Date.now() - task.last_run_at.getTime()) / 1000 : 0,
                }
            });
            return { success: true, records: totalRecords };
        }
        catch (error) {
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
            await this.prisma.crawlLog.create({
                data: {
                    crawl_date: task.date,
                    crawl_type: `SYNC_TASK_${task.type}_B${task.branch_id}`,
                    status: 'failed',
                    error_message: error.message,
                    duration_seconds: task.last_run_at ? (Date.now() - task.last_run_at.getTime()) / 1000 : 0,
                }
            });
            throw error;
        }
    }
};
exports.SyncService = SyncService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncService.prototype, "handleDailySync", null);
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bullmq_1.InjectQueue)('sync-queue')),
    __metadata("design:paramtypes", [vttech_api_service_1.VttechApiService,
        prisma_service_1.PrismaService,
        pbx_sync_service_1.PbxSyncService,
        bullmq_2.Queue])
], SyncService);
//# sourceMappingURL=sync.service.js.map