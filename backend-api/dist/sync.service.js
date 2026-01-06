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
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const vttech_api_service_1 = require("./vttech-api.service");
const prisma_service_1 = require("./prisma.service");
const pbx_sync_service_1 = require("./pbx-sync.service");
let SyncService = SyncService_1 = class SyncService {
    vttechApi;
    prisma;
    pbxSync;
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
    constructor(vttechApi, prisma, pbxSync) {
        this.vttechApi = vttechApi;
        this.prisma = prisma;
        this.pbxSync = pbxSync;
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
    async handleDailySync() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        await this.syncByRange(dateStr, dateStr);
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
            const start = new Date(dateFrom);
            const end = new Date(dateTo);
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
                    this.syncStatus.total = totalSteps;
                    this.syncStatus.current = currentStep;
                    this.syncStatus.progress = Math.round((currentStep / totalSteps) * 100);
                    this.syncStatus.message = `[${dateStr}] Đang xử lý: ${branch.name} (${i + 1}/${branches.length})`;
                    const branchCustomerIds = [];
                    this.addLog(`  👥 [${branch.name}] Tìm khách hàng mới/giao dịch/lịch sử...`);
                    branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 1, branch.id));
                    branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 2, branch.id));
                    branchCustomerIds.push(...await this.syncCustomers(dateStr, dateStr, 3, branch.id));
                    const appointmentIds = await this.syncAppointments(dateStr, dateStr, branch.id);
                    branchCustomerIds.push(...appointmentIds);
                    if (syncDetails) {
                        const uniqueBranchIds = [...new Set(branchCustomerIds)].filter(id => !syncedIdsInSession.has(id));
                        if (uniqueBranchIds.length > 0) {
                            const oldMsg = this.syncStatus.message;
                            this.syncStatus.message = `[${dateStr}] ${branch.name}: Sync chi tiết ${uniqueBranchIds.length} khách...`;
                            for (const customerId of uniqueBranchIds) {
                                if (this.syncStatus.shouldStop)
                                    break;
                                const stats = await this.syncSingleCustomerDetail(customerId);
                                sessionStats.payments += stats.payments;
                                sessionStats.treatments += stats.treatments;
                                sessionStats.services += stats.services;
                                syncedIdsInSession.add(customerId);
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
                this.addLog(`✅ Đã đồng bộ ${cdrResult.success} cuộc gọi (${cdrResult.failed} lỗi)`);
            }
            this.syncStatus.progress = 100;
            this.syncStatus.message = 'Hoàn thành!';
            this.syncStatus.endTime = Date.now();
            const duration = (this.syncStatus.endTime - startTime) / 1000;
            this.addLog(`✅ Hoàn tất quá trình đồng bộ trong ${duration}s.`);
            sessionStats.customers = syncedIdsInSession.size;
            await this.prisma.crawlLog.create({
                data: {
                    crawl_date: new Date(dateFrom),
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
                    crawl_date: new Date(dateFrom),
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
            const res = await this.vttechApi.callHandler('/Customer/ListCustomer/', 'LoadData', {
                dateFrom: `${dateFrom} 00:00:00`,
                dateTo: `${dateTo} 23:59:59`,
                branchID: branchId.toString(),
                type: type,
                BeginID: start,
                Limit: length,
            });
            const dataItems = this.ensureArray(res);
            if (dataItems.length > 0) {
                this.addLog(`  📥 Nhận được ${dataItems.length} khách hàng từ bản ghi thứ ${start}`);
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
                        await this.prisma.customer.upsert({
                            where: { id },
                            update: {
                                name,
                                phone,
                                email,
                                total_spent: paid,
                                total_debt: debt,
                                branch_id: branchIdFromData,
                            },
                            create: {
                                id,
                                name,
                                phone,
                                email,
                                total_spent: paid,
                                total_debt: debt,
                                branch_id: branchIdFromData,
                            },
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
        const res = await this.vttechApi.callHandler('/Appointment/AppointmentInDay/', 'LoadData', {
            dateFrom: `${dateFrom} 00:00:00`,
            dateTo: `${dateTo} 23:59:59`,
            branchID: branchId.toString(),
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
                            appointment_date: a.Date ? new Date(a.Date) : null,
                        },
                        create: {
                            id,
                            customer_id: customerId,
                            customer_name: a.CustomerName,
                            phone: a.Phone,
                            branch_id: parseInt(a.BranchID),
                            status: parseInt(a.Status),
                            appointment_date: a.Date ? new Date(a.Date) : null,
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
            const appointmentIds = await this.prisma.appointment.findMany({
                where: {
                    appointment_date: {
                        gte: new Date(new Date(dateFrom).setHours(0, 0, 0, 0)),
                        lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)),
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
                return;
            }
        }
        this.addLog('📦 Đang đồng bộ Master Data (Danh mục)...');
        const result = await this.vttechApi.callApi('/api/Home/SessionData', {});
        if (!result) {
            this.addLog('⚠️ Không lấy được SessionData');
            return;
        }
        if (result.Table) {
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
        await this.prisma.crawlLog.create({
            data: {
                crawl_date: new Date(),
                crawl_type: 'master_sync',
                status: 'success',
                records_count: 0
            }
        });
    }
    async syncSingleCustomerDetail(customerId) {
        this.addLog(`🔍 [ID: ${customerId}] 🚀 Bắt đầu Full Sync chi tiết...`);
        const stats = { payments: 0, treatments: 0, services: 0 };
        try {
            const payInfo = await this.vttechApi.callHandler('/Customer/MainCustomer/', 'LoadPaymentInfo', { CustomerID: customerId });
            const payInfoItems = this.ensureArray(payInfo);
            if (payInfoItems.length > 0) {
                const info = payInfoItems[0];
                await this.prisma.customer.update({
                    where: { id: customerId },
                    data: {
                        total_spent: parseFloat(info.PAID || info.Paid || 0) || 0,
                        total_debt: (parseFloat(info.PRICE_DISCOUNTED || 0) || 0) - (parseFloat(info.PAID || info.Paid || 0) || 0),
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
                    const price = parseFloat(s.Price || 0) || 0;
                    const qty = parseInt(s.Quantity || 1) || 1;
                    const total = parseFloat(s.Total || 0) || 0;
                    await this.prisma.customerServiceTab.upsert({
                        where: { customer_id_service_id: { customer_id: customerId, service_id: sId } },
                        update: {
                            service_name: s.ServiceName || '',
                            quantity: qty,
                            price: price,
                            total: total,
                            status: s.StatusName || ''
                        },
                        create: {
                            customer: { connect: { id: customerId } },
                            service_id: sId,
                            service_name: s.ServiceName || '',
                            quantity: qty,
                            price: price,
                            total: total,
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
        try {
            const payments = await this.vttechApi.callHandler('/Customer/Payment/PaymentList/PaymentList_Service/', 'LoadataPayment', { CustomerID: customerId });
            const items = this.ensureArray(payments);
            if (items.length > 0) {
                stats.payments = items.length;
                for (const p of items) {
                    const pId = parseInt(p.ID || p.id);
                    if (!pId)
                        continue;
                    await this.prisma.customerPayment.upsert({
                        where: { customer_id_payment_id: { customer_id: customerId, payment_id: pId } },
                        update: { amount: parseFloat(p.Amount || 0) || 0, payment_date: p.Date ? new Date(p.Date) : null, payment_method: p.MethodName || '', note: p.Note || '' },
                        create: {
                            customer: { connect: { id: customerId } },
                            payment_id: pId,
                            amount: parseFloat(p.Amount || 0) || 0,
                            payment_date: p.Date ? new Date(p.Date) : null,
                            payment_method: p.MethodName || '',
                            note: p.Note || ''
                        }
                    });
                }
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử thanh toán`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataPayment: ${e.message}`);
        }
        try {
            const treatments = await this.vttechApi.callHandler('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadataTreatment', { CustomerID: customerId });
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
                            customer: { connect: { id: customerId } },
                            customer_name: t.CustomerName || '',
                            service_name: t.ServiceName || '',
                            employee_name: t.EmployeeName || '',
                            treatment_date: t.Date ? new Date(t.Date) : null,
                            amount: parseFloat(t.Amount || 0) || 0
                        },
                        create: {
                            id: tId,
                            customer: { connect: { id: customerId } },
                            customer_name: t.CustomerName || '',
                            service_name: t.ServiceName || '',
                            employee_name: t.EmployeeName || '',
                            treatment_date: t.Date ? new Date(t.Date) : null,
                            amount: parseFloat(t.Amount || 0) || 0
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
            const history = await this.vttechApi.callHandler('/Customer/History/HistoryList_Care/', 'LoadataHistory', { CustomerID: customerId });
            const items = this.ensureArray(history);
            if (items.length > 0) {
                for (const h of items) {
                    const hId = parseInt(h.ID || h.id);
                    if (!hId)
                        continue;
                    await this.prisma.customerCareHistory.upsert({
                        where: { customer_id_history_id: { customer_id: customerId, history_id: hId } },
                        update: { action_type: h.TypeName || '', action_date: h.Date ? new Date(h.Date) : null, employee_name: h.EmployeeName || '', note: h.Content || '' },
                        create: {
                            customer: { connect: { id: customerId } },
                            history_id: hId,
                            action_type: h.TypeName || '',
                            action_date: h.Date ? new Date(h.Date) : null,
                            employee_name: h.EmployeeName || '',
                            note: h.Content || ''
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
            const installments = await this.vttechApi.callHandler('/Customer/Installment/InstallmentList/', 'LoadDetail', { CustomerID: customerId });
            const items = this.ensureArray(installments);
            if (items.length > 0) {
                for (const i of items) {
                    const insId = parseInt(i.ID || i.id);
                    if (!insId)
                        continue;
                    await this.prisma.customerInstallment.upsert({
                        where: { customer_id_installment_id: { customer_id: customerId, installment_id: insId } },
                        update: { total_amount: parseFloat(i.TotalAmount || 0) || 0, paid_amount: parseFloat(i.PaidAmount || 0) || 0, remain_amount: parseFloat(i.RemainAmount || 0) || 0, created_at: i.Date ? new Date(i.Date) : null, note: i.Note || '' },
                        create: {
                            customer: { connect: { id: customerId } },
                            installment_id: insId,
                            total_amount: parseFloat(i.TotalAmount || 0) || 0,
                            paid_amount: parseFloat(i.PaidAmount || 0) || 0,
                            remain_amount: parseFloat(i.RemainAmount || 0) || 0,
                            created_at: i.Date ? new Date(i.Date) : null,
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
                        update: { content: c.Content || '', status_name: c.StatusName || '', created_at: c.Date ? new Date(c.Date) : null },
                        create: {
                            customer: { connect: { id: customerId } },
                            complaint_id: compId,
                            content: c.Content || '',
                            status_name: c.StatusName || '',
                            created_at: c.Date ? new Date(c.Date) : null
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
                        update: { service_name: p.ServiceName || '', doctor_name: p.DoctorName || '', created_at: p.Date ? new Date(p.Date) : null, note: p.Note || '' },
                        create: {
                            customer: { connect: { id: customerId } },
                            plan_id: pId,
                            service_name: p.ServiceName || '',
                            doctor_name: p.DoctorName || '',
                            created_at: p.Date ? new Date(p.Date) : null,
                            note: p.Note || ''
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
                        update: { content: c.Content || '', employee_name: c.EmployeeName || '', action_date: c.Date ? new Date(c.Date) : null },
                        create: {
                            customer: { connect: { id: customerId } },
                            history_id: hId,
                            content: c.Content || '',
                            employee_name: c.EmployeeName || '',
                            action_date: c.Date ? new Date(c.Date) : null
                        }
                    });
                }
                this.addLog(`   ✅ [ID: ${customerId}] Đã đồng bộ ${items.length} Lịch sử thay đổi hồ sơ`);
            }
        }
        catch (e) {
            this.addLog(`   ❌ [ID: ${customerId}] Lỗi LoadataTab_History_Change: ${e.message}`);
        }
        this.addLog(`✅ [ID: ${customerId}] Kết thúc Full Sync.`);
        return stats;
    }
    async getLogs(limit = 100) {
        return this.prisma.crawlLog.findMany({
            take: limit,
            orderBy: { created_at: 'desc' },
        });
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
    __metadata("design:paramtypes", [vttech_api_service_1.VttechApiService,
        prisma_service_1.PrismaService,
        pbx_sync_service_1.PbxSyncService])
], SyncService);
//# sourceMappingURL=sync.service.js.map