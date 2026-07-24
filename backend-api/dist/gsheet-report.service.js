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
var GsheetReportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GsheetReportService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("./prisma.service");
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let GsheetReportService = GsheetReportService_1 = class GsheetReportService {
    prisma;
    logger = new common_1.Logger(GsheetReportService_1.name);
    SPREADSHEET_ID = '1GW8hVnHnT0LzLOxbFzt9PWdJwzKWMYX1_H6UnJdapUw';
    BATCH_SIZE = 5000;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleDailyGsheetReportCron() {
        this.logger.log('⏰ [CRON] Khởi chạy cron job so sánh và đẩy báo cáo Google Sheets (07:00 AM)...');
        const config = await this.prisma.cronConfig.findUnique({
            where: { id: 'handleGsheetReportCron' }
        }).catch(() => null);
        if (config && !config.enabled) {
            this.logger.log('🚫 [CRON] handleGsheetReportCron bị vô hiệu hóa trong cấu hình.');
            return;
        }
        try {
            const result = await this.compareAndPushData();
            this.logger.log(`✅ [CRON] Đồng bộ thành công: ${result.totalDb} KH đã đẩy lên Sheets.`);
        }
        catch (err) {
            this.logger.error(`❌ [CRON ERROR] Đồng bộ thất bại: ${err.message}`);
        }
    }
    async getReports(limit = 50) {
        return this.prisma.gsheetReport.findMany({
            orderBy: { report_date: 'desc' },
            take: limit,
        });
    }
    async getReportById(id) {
        return this.prisma.gsheetReport.findUnique({
            where: { id }
        });
    }
    async compareAndPushData() {
        const startTime = Date.now();
        this.logger.log('🔄 Bắt đầu đối soát dữ liệu DB và Google Sheets...');
        const serviceAccountPath = path.resolve(process.cwd(), 'google-service-account.json');
        if (!fs.existsSync(serviceAccountPath)) {
            throw new Error(`Không tìm thấy file credentials tại path: ${serviceAccountPath}`);
        }
        const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
        const boundaryDate = new Date('2024-01-01T00:00:00.000Z');
        const dbCustomers = await this.prisma.customer.findMany({
            where: {
                OR: [
                    { crm_created_at: { gte: boundaryDate } },
                    {
                        AND: [
                            { crm_created_at: null },
                            { created_at: { gte: boundaryDate } }
                        ]
                    }
                ]
            },
            orderBy: [
                { crm_created_at: 'asc' },
                { id: 'asc' }
            ],
            select: {
                name: true,
                phone: true,
                gender: true,
                birthday: true,
                address: true,
                crm_created_at: true,
                created_at: true,
                branch: {
                    select: {
                        name: true
                    }
                },
                appointments: {
                    orderBy: {
                        appointment_date: 'asc'
                    },
                    select: {
                        id: true,
                        vttech_code: true,
                        appointment_date: true,
                        status: true,
                        status_name: true
                    }
                }
            }
        });
        const totalDbCount = dbCustomers.length;
        const dbGrouped = {};
        for (const c of dbCustomers) {
            const creationDate = c.crm_created_at || c.created_at;
            if (!creationDate)
                continue;
            const year = creationDate.getFullYear();
            if (!dbGrouped[year])
                dbGrouped[year] = [];
            dbGrouped[year].push(c);
        }
        const meta = await sheets.spreadsheets.get({ spreadsheetId: this.SPREADSHEET_ID });
        const existingSheets = meta.data.sheets || [];
        const sheetTitles = existingSheets.map(s => s.properties?.title || '');
        const yearsToCheck = [2024, 2025, 2026];
        let totalSheetCount = 0;
        let totalDifference = 0;
        let mdReport = `# Báo cáo So sánh dữ liệu Database và Google Sheets\n`;
        mdReport += `*Thời gian thực hiện: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}*\n\n`;
        mdReport += `## 1. Tổng quan số lượng bản ghi\n\n`;
        mdReport += `| Năm | Số lượng trên Sheet | Số lượng trong DB | Chênh lệch (DB - Sheet) | Trạng thái |\n`;
        mdReport += `| :---: | :---: | :---: | :---: | :---: |\n`;
        const newRecordsList = [];
        for (const year of yearsToCheck) {
            const sheetTitle = String(year);
            const dbCount = dbGrouped[year]?.length || 0;
            let sheetCount = 0;
            const sheetPhones = new Set();
            if (sheetTitles.includes(sheetTitle)) {
                try {
                    const response = await sheets.spreadsheets.values.get({
                        spreadsheetId: this.SPREADSHEET_ID,
                        range: `'${sheetTitle}'!A2:B`,
                    });
                    const rows = response.data.values || [];
                    sheetCount = rows.length;
                    totalSheetCount += sheetCount;
                    for (const row of rows) {
                        let phone = row[1] || '';
                        phone = phone.replace(/^'/, '').trim();
                        if (phone)
                            sheetPhones.add(phone);
                    }
                }
                catch (e) {
                    this.logger.error(`Lỗi đọc sheet ${sheetTitle}: ${e.message}`);
                }
            }
            const diff = dbCount - sheetCount;
            if (diff > 0)
                totalDifference += diff;
            const status = diff === 0 ? '✅ Trùng khớp' : (diff > 0 ? `⚠️ Có ${diff} bản ghi mới` : `🚨 Sheet thừa ${Math.abs(diff)} bản ghi`);
            mdReport += `| **${year}** | ${sheetCount.toLocaleString()} | ${dbCount.toLocaleString()} | ${diff > 0 ? '+' : ''}${diff.toLocaleString()} | ${status} |\n`;
            if (diff > 0 && dbGrouped[year]) {
                let yearNewCount = 0;
                newRecordsList.push(`### Lịch sử các bản ghi mới phát sinh trong năm ${year}:\n`);
                newRecordsList.push(`| STT | Họ tên khách hàng | Số điện thoại | Ngày tạo |\n`);
                newRecordsList.push(`| :---: | :--- | :---: | :---: |\n`);
                for (const c of dbGrouped[year]) {
                    let dbPhone = c.phone || '';
                    if (dbPhone && !dbPhone.startsWith('0'))
                        dbPhone = '0' + dbPhone;
                    if (!sheetPhones.has(dbPhone)) {
                        yearNewCount++;
                        const dateStr = this.formatDateTime(c.crm_created_at || c.created_at);
                        newRecordsList.push(`| ${yearNewCount} | ${c.name} | ${dbPhone} | ${dateStr} |\n`);
                        if (yearNewCount >= 10) {
                            newRecordsList.push(`| ... | và một số khách hàng khác... | | |\n`);
                            break;
                        }
                    }
                }
                newRecordsList.push(`\n`);
            }
        }
        mdReport += `\n`;
        mdReport += `## 2. Chi tiết các bản ghi mới cần push bổ sung\n\n`;
        if (totalDifference === 0) {
            mdReport += `Không phát sinh thêm khách hàng mới kể từ lần đồng bộ trước. Dữ liệu trên Google Sheet hiện tại đã trùng khớp 100% với Database.\n`;
        }
        else {
            mdReport += `Phát hiện tổng cộng **${totalDifference}** khách hàng mới được tạo trong database chưa được đẩy lên Google Sheets.\n\n`;
            mdReport += newRecordsList.join('');
        }
        const savedReport = await this.prisma.gsheetReport.create({
            data: {
                report_date: new Date(),
                status: 'success',
                total_db: totalDbCount,
                total_sheet: totalSheetCount,
                diff: totalDifference,
                report_content: mdReport
            }
        });
        this.logger.log(`📝 Đã lưu báo cáo so sánh số ID #${savedReport.id} vào PostgreSQL.`);
        this.logger.log('📤 Bắt đầu đẩy dữ liệu mới lên Google Sheets...');
        const header = [
            'Tên',
            'Phone',
            'GIỚI TÍNH',
            'SINH NHẬT',
            'ĐỊA CHỈ',
            'CHI NHÁNH',
            'LỊCH HẸN ĐẦU TIÊN',
            'LỊCH HẸN ĐẾN ĐẦU TIÊN',
            'NGÀY TẠO'
        ];
        const existingTitlesSet = new Set(sheetTitles);
        const years = Object.keys(dbGrouped).map(Number).sort((a, b) => a - b);
        for (const year of years) {
            const sheetTitle = String(year);
            if (!existingTitlesSet.has(sheetTitle)) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.SPREADSHEET_ID,
                    requestBody: {
                        requests: [
                            {
                                addSheet: {
                                    properties: { title: sheetTitle },
                                },
                            },
                        ],
                    },
                });
                existingTitlesSet.add(sheetTitle);
            }
        }
        const updatedMeta = await sheets.spreadsheets.get({ spreadsheetId: this.SPREADSHEET_ID });
        const allSheets = updatedMeta.data.sheets || [];
        const sheetMap = new Map(allSheets.map(s => [s.properties?.title, s.properties?.sheetId]));
        for (const year of years) {
            const sheetTitle = String(year);
            const sheetId = sheetMap.get(sheetTitle);
            if (sheetId === undefined)
                continue;
            const dataRows = dbGrouped[year].map(c => {
                const phoneStr = c.phone ? (c.phone.startsWith('0') ? `'${c.phone}` : `'0${c.phone}`) : '';
                const creationDate = c.crm_created_at || c.created_at;
                const firstApp = c.appointments.length > 0 ? c.appointments[0] : null;
                const firstAttendedApp = c.appointments.find(app => app.status === 2) || null;
                return [
                    c.name || '',
                    phoneStr,
                    formatGender(c.gender),
                    formatBirthday(c.birthday),
                    c.address || '',
                    c.branch?.name || '',
                    formatAppointment(firstApp),
                    formatAppointment(firstAttendedApp),
                    this.formatDateTime(creationDate)
                ];
            });
            const allRows = [header, ...dataRows];
            const totalRows = allRows.length;
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.SPREADSHEET_ID,
                requestBody: {
                    requests: [
                        {
                            updateSheetProperties: {
                                properties: {
                                    sheetId,
                                    gridProperties: {
                                        rowCount: Math.max(1000, totalRows + 100),
                                        columnCount: 9,
                                    },
                                },
                                fields: 'gridProperties(rowCount,columnCount)',
                            },
                        },
                    ],
                },
            });
            await sheets.spreadsheets.values.clear({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `'${sheetTitle}'!A1:I`,
            });
            for (let i = 0; i < totalRows; i += this.BATCH_SIZE) {
                const batch = allRows.slice(i, Math.min(i + this.BATCH_SIZE, totalRows));
                const startRow = i + 1;
                const endRow = startRow + batch.length - 1;
                const range = `'${sheetTitle}'!A${startRow}:I${endRow}`;
                await sheets.spreadsheets.values.update({
                    spreadsheetId: this.SPREADSHEET_ID,
                    range,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: batch,
                    },
                });
                if (i + this.BATCH_SIZE < totalRows) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.SPREADSHEET_ID,
                requestBody: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId,
                                    startRowIndex: 0,
                                    endRowIndex: 1,
                                    startColumnIndex: 0,
                                    endColumnIndex: 9,
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.16, green: 0.38, blue: 0.71 },
                                        textFormat: {
                                            bold: true,
                                            foregroundColor: { red: 1, green: 1, blue: 1 },
                                            fontSize: 11,
                                        },
                                        horizontalAlignment: 'CENTER',
                                        verticalAlignment: 'MIDDLE',
                                    },
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
                            },
                        },
                        {
                            updateSheetProperties: {
                                properties: {
                                    sheetId,
                                    gridProperties: { frozenRowCount: 1 },
                                },
                                fields: 'gridProperties.frozenRowCount',
                            },
                        },
                        {
                            autoResizeDimensions: {
                                dimensions: {
                                    sheetId,
                                    dimension: 'COLUMNS',
                                    startIndex: 0,
                                    endIndex: 9,
                                },
                            },
                        },
                        {
                            repeatCell: {
                                range: {
                                    sheetId,
                                    startRowIndex: 1,
                                    endRowIndex: totalRows,
                                    startColumnIndex: 2,
                                    endColumnIndex: 4,
                                },
                                cell: {
                                    userEnteredFormat: { horizontalAlignment: 'CENTER' },
                                },
                                fields: 'userEnteredFormat(horizontalAlignment)',
                            },
                        },
                        {
                            repeatCell: {
                                range: {
                                    sheetId,
                                    startRowIndex: 1,
                                    endRowIndex: totalRows,
                                    startColumnIndex: 5,
                                    endColumnIndex: 9,
                                },
                                cell: {
                                    userEnteredFormat: { horizontalAlignment: 'CENTER' },
                                },
                                fields: 'userEnteredFormat(horizontalAlignment)',
                            },
                        },
                        {
                            setBasicFilter: {
                                filter: {
                                    range: {
                                        sheetId,
                                        startRowIndex: 0,
                                        endRowIndex: totalRows,
                                        startColumnIndex: 0,
                                        endColumnIndex: 9,
                                    },
                                },
                            },
                        },
                    ],
                },
            });
        }
        const defaultSheetId = sheetMap.get('Trang tính1');
        if (defaultSheetId !== undefined && allSheets.length > 1) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.SPREADSHEET_ID,
                requestBody: {
                    requests: [
                        {
                            deleteSheet: { sheetId: defaultSheetId },
                        },
                    ],
                },
            });
        }
        await this.prisma.crawlLog.create({
            data: {
                crawl_date: new Date(),
                crawl_type: 'handleGsheetReportCron',
                status: 'success',
                message: `Đẩy thành công ${totalDbCount} KH (Chênh lệch: +${totalDifference} KH mới). Báo cáo #${savedReport.id}`,
                records_count: totalDbCount,
            }
        }).catch(e => this.logger.error(`Lỗi ghi crawlLog: ${e.message}`));
        return {
            reportId: savedReport.id,
            totalDb: totalDbCount,
            totalSheet: totalSheetCount,
            difference: totalDifference,
            markdown: mdReport
        };
    }
    formatDateTime(date) {
        if (!date)
            return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${d}-${m}-${y} ${hh}:${mm}:${ss}`;
    }
};
exports.GsheetReportService = GsheetReportService;
__decorate([
    (0, schedule_1.Cron)('0 0 7 * * *', {
        timeZone: 'Asia/Ho_Chi_Minh'
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GsheetReportService.prototype, "handleDailyGsheetReportCron", null);
exports.GsheetReportService = GsheetReportService = GsheetReportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GsheetReportService);
function formatBirthday(date) {
    if (!date)
        return '';
    const y = date.getFullYear();
    if (y === 1900 || y === 1899)
        return '';
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}-${m}-${y}`;
}
function formatGender(gender) {
    if (gender === 60)
        return 'NAM';
    if (gender === 61)
        return 'NỮ';
    return '';
}
function formatDateTimeMin(date) {
    if (!date)
        return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm} ${d}-${m}-${y}`;
}
function formatAppointment(app) {
    if (!app)
        return '';
    const code = app.vttech_code || `ID#${app.id}`;
    const dateStr = formatDateTimeMin(app.appointment_date);
    let statusText = app.status_name || '';
    if (!statusText) {
        if (app.status === 1)
            statusText = 'Đặt Hẹn';
        else if (app.status === 2)
            statusText = 'Đã Đến';
        else if (app.status === 3)
            statusText = 'Đã Hủy';
        else
            statusText = `Trạng thái #${app.status}`;
    }
    return `${code} - ${dateStr} - ${statusText}`;
}
//# sourceMappingURL=gsheet-report.service.js.map