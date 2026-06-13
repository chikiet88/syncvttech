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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ExcelExportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const ExcelJS = __importStar(require("exceljs"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const schedule_1 = require("@nestjs/schedule");
let ExcelExportService = ExcelExportService_1 = class ExcelExportService {
    prisma;
    logger = new common_1.Logger(ExcelExportService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getFormattedAppointmentsData(dateFromStr, dateToStr, branchId) {
        const parseDate = (dStr, isEnd) => {
            if (!dStr)
                return new Date();
            const separator = dStr.includes('/') ? '/' : '-';
            const parts = dStr.split(separator);
            let date;
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    date = new Date(dStr);
                }
                else {
                    const [d, m, y] = parts;
                    date = new Date(`${y}-${m}-${d}`);
                }
            }
            else {
                date = new Date(dStr);
            }
            if (isEnd) {
                date.setHours(23, 59, 59, 999);
            }
            else {
                date.setHours(0, 0, 0, 0);
            }
            return date;
        };
        const start = parseDate(dateFromStr, false);
        const end = parseDate(dateToStr, true);
        this.logger.log(`Fetching appointments for formatting: ${start.toISOString()} to ${end.toISOString()} (Branch: ${branchId})`);
        const where = {};
        const whereAndConditions = [];
        whereAndConditions.push({
            appointment_date: {
                gte: start,
                lte: end,
            },
        });
        if (branchId === 'taza') {
            whereAndConditions.push({
                branch: {
                    name: { contains: 'Taza', mode: 'insensitive' },
                },
            });
        }
        else if (branchId === 'timona') {
            whereAndConditions.push({
                branch: {
                    name: { contains: 'Timona', mode: 'insensitive' },
                },
            });
        }
        else if (branchId && branchId !== '0') {
            whereAndConditions.push({ branch_id: parseInt(branchId) });
        }
        else {
            whereAndConditions.push({
                branch: {
                    OR: [
                        { name: { contains: 'Taza', mode: 'insensitive' } },
                        { name: { contains: 'Timona', mode: 'insensitive' } },
                    ],
                },
            });
        }
        whereAndConditions.push({
            OR: [
                { status_name: { contains: 'Ra Về', mode: 'insensitive' } },
                {
                    AND: [
                        { OR: [{ status_name: null }, { status_name: '' }] },
                        { OR: [{ status: 2 }, { status: 4 }] }
                    ]
                }
            ]
        });
        whereAndConditions.push({
            OR: [
                { type_name: { contains: 'tư vấn', mode: 'insensitive' } },
                {
                    AND: [
                        { OR: [{ type_name: null }, { type_name: '' }] },
                        { service_name: { contains: 'tư vấn', mode: 'insensitive' } }
                    ]
                }
            ]
        });
        where.AND = whereAndConditions;
        const [appointments, services, groups] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                include: {
                    customer: {
                        include: {
                            source: true,
                        },
                    },
                    branch: true,
                },
                orderBy: {
                    appointment_date: 'asc',
                },
            }),
            this.prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
            this.prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
        ]);
        const serviceMap = new Map(services.map(s => [s.id, s]));
        const groupMap = new Map(groups.map(g => [g.id, g.name]));
        const creatorIds = [...new Set(appointments.map(a => a.created_by_id).filter(Boolean))];
        const employeeMap = new Map();
        if (creatorIds.length > 0) {
            const users = await this.prisma.user.findMany({
                where: { id: { in: creatorIds } },
                select: { id: true, full_name: true },
            });
            users.forEach(u => {
                if (u.full_name)
                    employeeMap.set(u.id, u.full_name);
            });
            const missingIds = creatorIds.filter(id => !employeeMap.has(id));
            if (missingIds.length > 0) {
                const employees = await this.prisma.employee.findMany({
                    where: { id: { in: missingIds } },
                    select: { id: true, name: true },
                });
                employees.forEach(e => {
                    if (e.name)
                        employeeMap.set(e.id, e.name);
                });
            }
        }
        const formatExcelDateString = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };
        const formatCreatorString = (creatorId, createdDate) => {
            const creatorName = creatorId ? (employeeMap.get(creatorId) || '') : '';
            if (!createdDate)
                return creatorName;
            const hh = String(createdDate.getHours()).padStart(2, '0');
            const mm = String(createdDate.getMinutes()).padStart(2, '0');
            const dd = String(createdDate.getDate()).padStart(2, '0');
            const mMonth = String(createdDate.getMonth() + 1).padStart(2, '0');
            const yyyy = createdDate.getFullYear();
            return `${creatorName}${hh}:${mm} ${dd}-${mMonth}-${yyyy}`.trim();
        };
        return appointments.map(a => {
            const customer = a.customer;
            const custCode = customer?.code || '';
            const custName = customer?.name || a.customer_name || '';
            const mlhKh = `${custCode}${custName}`;
            const appointmentDateStr = a.appointment_date
                ? formatExcelDateString(a.appointment_date)
                : '';
            const saleTimeDate = formatCreatorString(a.created_by_id, a.vttech_created_at || a.appointment_date);
            const sourceName = customer?.source?.name || 'Khách Giới Thiệu';
            const service = a.service_id ? serviceMap.get(a.service_id) : null;
            const funnelName = service?.group_id ? groupMap.get(service.group_id) : '';
            const noteWithFunnel = funnelName ? `[${funnelName}] ${a.note || ''}`.trim() : (a.note || '');
            return {
                vttech_code: a.vttech_code || '',
                mlh_kh: mlhKh,
                appointment_date: appointmentDateStr,
                phone: a.phone || '',
                note: noteWithFunnel,
                status_name: a.status_name || ((a.status === 2 || a.status === 4) ? 'Ra Về' : a.status === 3 ? 'Đã Hủy' : 'Đặt Hẹn'),
                branch_name: a.branch?.name || a.branch_name || '',
                type_name: a.type_name || (a.service_name?.toLowerCase().includes('tư vấn') ? 'Tư vấn' : 'Điều trị'),
                sale_time_date: saleTimeDate,
                source_name: sourceName,
            };
        });
    }
    async exportAppointmentsToExcel(dateFromStr, dateToStr, branchId) {
        const formattedData = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, branchId);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('LỊCH HẸN');
        worksheet.columns = [
            { header: 'Mã lịch hẹn', key: 'vttech_code', width: 25 },
            { header: 'MLH&KH', key: 'mlh_kh', width: 35 },
            { header: 'Ngày hẹn', key: 'appointment_date', width: 45 },
            { header: 'Số điện thoại', key: 'phone', width: 15 },
            { header: 'Nội dung', key: 'note', width: 50 },
            { header: 'Trạng thái', key: 'status_name', width: 15 },
            { header: 'Chi nhánh', key: 'branch_name', width: 30 },
            { header: 'Loại', key: 'type_name', width: 15 },
            { header: 'TEN SALE&THỜI GIAN&NGÀY', key: 'sale_time_date', width: 40 },
            { header: 'Nguồn khách hàng', key: 'source_name', width: 20 },
        ];
        worksheet.getRow(1).font = { name: 'Inter', size: 10, bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
        formattedData.forEach(row => {
            const addedRow = worksheet.addRow(row);
            addedRow.font = { name: 'Inter', size: 9 };
            addedRow.alignment = { vertical: 'middle', wrapText: true };
        });
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        return buffer;
    }
    async pushToGoogleSheet(dateFromStr, dateToStr) {
        this.logger.log(`Pushing appointments to Google Sheets for range: ${dateFromStr} to ${dateToStr}`);
        let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        let privateKey = process.env.GOOGLE_PRIVATE_KEY;
        if (!clientEmail || !privateKey) {
            let creds = null;
            if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
                try {
                    creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
                }
                catch (e) {
                    this.logger.error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY env var: ${e.message}`);
                }
            }
            if (!creds && process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
                try {
                    if (fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH)) {
                        creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
                    }
                }
                catch (e) {
                    this.logger.error(`Failed to read GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${e.message}`);
                }
            }
            if (!creds) {
                const paths = [
                    './google-service-account.json',
                    '../google-service-account.json',
                    '/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json'
                ];
                for (const p of paths) {
                    if (fs.existsSync(p)) {
                        try {
                            creds = JSON.parse(fs.readFileSync(p, 'utf8'));
                            this.logger.log(`Loaded credentials from fallback path: ${p}`);
                            break;
                        }
                        catch (e) {
                            this.logger.error(`Failed to read credentials from fallback path ${p}: ${e.message}`);
                        }
                    }
                }
            }
            if (creds) {
                clientEmail = creds.client_email;
                privateKey = creds.private_key;
            }
        }
        if (!clientEmail || !privateKey) {
            throw new Error('Google Service Account credentials are not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_PATH in .env');
        }
        const token = await this.getGoogleSheetsAccessToken(clientEmail, privateKey);
        const tazaRows = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, 'taza');
        const timonaRows = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, 'timona');
        const spreadsheetId = '1G_R_JeKOQhvKj_F_fXmfSfsgIupYyJmgvq22s2Jk7GU';
        const headers = [
            'Mã lịch hẹn',
            'MLH&KH',
            'Ngày hẹn',
            'Số điện thoại',
            'Nội dung',
            'Trạng thái',
            'Chi nhánh',
            'Loại',
            'TEN SALE&THỜI GIAN&NGÀY',
            'Nguồn khách hàng',
        ];
        const formatRowData = (row) => [
            row.vttech_code,
            row.mlh_kh,
            row.appointment_date,
            row.phone,
            row.note,
            row.status_name,
            row.branch_name,
            row.type_name,
            row.sale_time_date,
            row.source_name,
        ];
        const tazaValues = [headers, ...tazaRows.map(formatRowData)];
        const timonaValues = [headers, ...timonaRows.map(formatRowData)];
        this.logger.log(`Clearing and writing ${tazaRows.length} rows to Taza sheet`);
        await axios_1.default.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!A:Z:clear`, {}, { headers: { Authorization: `Bearer ${token}` } });
        await axios_1.default.put(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!A1?valueInputOption=USER_ENTERED`, { values: tazaValues }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
        this.logger.log(`Clearing and writing ${timonaRows.length} rows to Timona sheet`);
        await axios_1.default.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Timona!A:Z:clear`, {}, { headers: { Authorization: `Bearer ${token}` } });
        await axios_1.default.put(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Timona!A1?valueInputOption=USER_ENTERED`, { values: timonaValues }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
        return {
            tazaCount: tazaRows.length,
            timonaCount: timonaRows.length,
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        };
    }
    async getGoogleSheetsAccessToken(clientEmail, privateKey) {
        const header = {
            alg: 'RS256',
            typ: 'JWT',
        };
        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: clientEmail,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now,
        };
        const base64UrlEncode = (obj) => {
            return Buffer.from(JSON.stringify(obj))
                .toString('base64')
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
        };
        const tokenInput = `${base64UrlEncode(header)}.${base64UrlEncode(claim)}`;
        const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(tokenInput);
        const signature = signer.sign(formattedPrivateKey, 'base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
        const jwt = `${tokenInput}.${signature}`;
        const response = await axios_1.default.post('https://oauth2.googleapis.com/token', {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        });
        return response.data.access_token;
    }
    async handleGoogleSheetPushCron() {
        const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleGoogleSheetPushCron' } }).catch(() => null);
        if (config && !config.enabled) {
            this.logger.log('[CRON] handleGoogleSheetPushCron bị vô hiệu hóa trong cấu hình.');
            return;
        }
        this.logger.log('[CRON] Bắt đầu tự động đẩy dữ liệu báo cáo lịch hẹn lên Google Sheets...');
        try {
            const now = new Date();
            const toStr = now.toISOString().split('T')[0];
            const fromStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            this.logger.log(`[CRON] Khoảng ngày tự động đẩy: ${fromStr} -> ${toStr}`);
            const result = await this.pushToGoogleSheet(fromStr, toStr);
            this.logger.log(`[CRON] Đã tự động đẩy dữ liệu thành công! Taza: ${result.tazaCount} dòng, Timona: ${result.timonaCount} dòng.`);
        }
        catch (e) {
            this.logger.error(`[CRON] Lỗi khi tự động đẩy dữ liệu lên Google Sheets: ${e.message}`, e.stack);
        }
    }
};
exports.ExcelExportService = ExcelExportService;
__decorate([
    (0, schedule_1.Cron)('0 0 7,19 * * *', {
        timeZone: 'Asia/Ho_Chi_Minh',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExcelExportService.prototype, "handleGoogleSheetPushCron", null);
exports.ExcelExportService = ExcelExportService = ExcelExportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExcelExportService);
//# sourceMappingURL=excel-export.service.js.map