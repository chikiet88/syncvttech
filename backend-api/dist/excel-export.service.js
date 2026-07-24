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
    async getFormattedAppointmentsData(dateFromStr, dateToStr, branchId, sortOrder = 'asc', allAppointments = false) {
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
        if (!allAppointments) {
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
        }
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
                orderBy: [
                    { appointment_date: sortOrder },
                    { id: sortOrder }
                ],
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
            let funnelName = '';
            const serviceNameLower = a.service_name?.toLowerCase().trim();
            const matchedGroup = groups.find(g => g.name.toLowerCase().trim() === serviceNameLower);
            if (matchedGroup) {
                funnelName = matchedGroup.name;
            }
            else {
                const service = a.service_id ? serviceMap.get(a.service_id) : null;
                if (service && service.name.toLowerCase().trim() === serviceNameLower) {
                    funnelName = service.group_id ? groupMap.get(service.group_id) || '' : '';
                }
                else {
                    const groupById = a.service_id ? groupMap.get(a.service_id) : null;
                    if (groupById) {
                        funnelName = groupById;
                    }
                    else if (service) {
                        funnelName = service.group_id ? groupMap.get(service.group_id) || '' : '';
                    }
                }
            }
            const noteWithFunnel = funnelName ? `${funnelName}\n${a.note || ''}`.trim() : (a.note || '');
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
        const formattedData = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, branchId, 'desc');
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
    async pushToGoogleSheet(dateFromStr, dateToStr, spreadsheetId = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg', allAppointments = true, shouldDuplicateBackup = false) {
        this.logger.log(`Pushing appointments to Google Sheets for range: ${dateFromStr} to ${dateToStr} (ID: ${spreadsheetId}, backup: ${shouldDuplicateBackup})`);
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
        const readSheetCodes = async (sheetName) => {
            try {
                this.logger.log(`Reading existing codes from ${sheetName} sheet...`);
                const response = await axios_1.default.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:A`, { headers: { Authorization: `Bearer ${token}` } });
                const rows = response.data.values || [];
                const codes = rows.slice(1).map((r) => r[0]).filter(Boolean);
                return new Set(codes);
            }
            catch (err) {
                this.logger.error(`Failed to read sheet codes for ${sheetName}: ${err.message}`);
                return new Set();
            }
        };
        if (shouldDuplicateBackup && !allAppointments) {
            try {
                const now = new Date();
                const vnDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }).format(now);
                const ddmm = vnDate.replace('/', '');
                this.logger.log(`[Backup] Creating snapshot sheets with suffix _${ddmm}...`);
                const metaRes = await axios_1.default.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, { headers: { Authorization: `Bearer ${token}` } });
                const allSheets = metaRes.data.sheets || [];
                const backupRequests = [];
                let insertIndex = 2;
                for (const sourceName of ['Taza', 'Timona']) {
                    const sourceSheet = allSheets.find((s) => s.properties.title === sourceName);
                    if (!sourceSheet) {
                        this.logger.warn(`[Backup] Sheet "${sourceName}" not found, skipping backup.`);
                        continue;
                    }
                    const backupName = `${sourceName}_${ddmm}`;
                    const existingBackup = allSheets.find((s) => s.properties.title === backupName);
                    if (existingBackup) {
                        this.logger.log(`[Backup] Deleting existing backup "${backupName}" (ID=${existingBackup.properties.sheetId})`);
                        backupRequests.push({ deleteSheet: { sheetId: existingBackup.properties.sheetId } });
                    }
                    this.logger.log(`[Backup] Duplicating "${sourceName}" (ID=${sourceSheet.properties.sheetId}) -> "${backupName}" at index ${insertIndex}`);
                    backupRequests.push({
                        duplicateSheet: {
                            sourceSheetId: sourceSheet.properties.sheetId,
                            newSheetName: backupName,
                            insertSheetIndex: insertIndex,
                        }
                    });
                    insertIndex++;
                }
                if (backupRequests.length > 0) {
                    await axios_1.default.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, { requests: backupRequests }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
                    this.logger.log(`[Backup] Snapshot _${ddmm} created successfully!`);
                }
            }
            catch (backupError) {
                this.logger.error(`[Backup] Failed to duplicate backup sheets: ${backupError.message}`, backupError.stack);
            }
        }
        const tazaRows = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, 'taza', 'asc', allAppointments);
        const timonaRows = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, 'timona', 'asc', allAppointments);
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
        const targets = [];
        const getRowYear = (row) => {
            if (row.appointment_date) {
                const parts = row.appointment_date.split('-');
                if (parts.length === 3 && parts[2].length === 4) {
                    return parts[2];
                }
            }
            return new Date().getFullYear().toString();
        };
        if (!allAppointments) {
            const tazaExistingCodes = await readSheetCodes('Taza');
            const timonaExistingCodes = await readSheetCodes('Timona');
            const newTazaRows = tazaRows.filter(row => !tazaExistingCodes.has(row.vttech_code));
            const newTimonaRows = timonaRows.filter(row => !timonaExistingCodes.has(row.vttech_code));
            targets.push({
                sheetName: 'Taza',
                allRows: tazaRows,
                existingCodes: tazaExistingCodes,
                newRows: newTazaRows,
            });
            targets.push({
                sheetName: 'Timona',
                allRows: timonaRows,
                existingCodes: timonaExistingCodes,
                newRows: newTimonaRows,
            });
        }
        else {
            const tazaYears = tazaRows.map(getRowYear);
            const timonaYears = timonaRows.map(getRowYear);
            const allYears = [...new Set([...tazaYears, ...timonaYears])].sort();
            this.logger.log(`Detected years for splitting: ${allYears.join(', ')}`);
            for (const year of allYears) {
                const tazaYearRows = tazaRows.filter(row => getRowYear(row) === year);
                const timonaYearRows = timonaRows.filter(row => getRowYear(row) === year);
                const tazaYearExistingCodes = await readSheetCodes(`Taza_${year}`);
                const timonaYearExistingCodes = await readSheetCodes(`Timona_${year}`);
                const newTazaYearRows = tazaYearRows.filter(row => !tazaYearExistingCodes.has(row.vttech_code));
                const newTimonaYearRows = timonaYearRows.filter(row => !timonaYearExistingCodes.has(row.vttech_code));
                targets.push({
                    sheetName: `Taza_${year}`,
                    allRows: tazaYearRows,
                    existingCodes: tazaYearExistingCodes,
                    newRows: newTazaYearRows,
                });
                targets.push({
                    sheetName: `Timona_${year}`,
                    allRows: timonaYearRows,
                    existingCodes: timonaYearExistingCodes,
                    newRows: newTimonaYearRows,
                });
            }
        }
        const writeInChunks = async (sheetName, allValues) => {
            const CHUNK_SIZE = 10000;
            for (let i = 0; i < allValues.length; i += CHUNK_SIZE) {
                const chunk = allValues.slice(i, i + CHUNK_SIZE);
                const startRow = i + 1;
                const range = `'${sheetName}'!A${startRow}`;
                this.logger.log(`Writing ${chunk.length} rows to ${range}`);
                await axios_1.default.put(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, { values: chunk }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
            }
        };
        const appendInChunks = async (sheetName, allValues) => {
            const CHUNK_SIZE = 10000;
            for (let i = 0; i < allValues.length; i += CHUNK_SIZE) {
                const chunk = allValues.slice(i, i + CHUNK_SIZE);
                this.logger.log(`Appending ${chunk.length} rows to ${sheetName}`);
                const range = `'${sheetName}'!A1`;
                await axios_1.default.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, { values: chunk }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
            }
        };
        try {
            this.logger.log('Checking spreadsheet sheets metadata...');
            const metaResponse = await axios_1.default.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, { headers: { Authorization: `Bearer ${token}` } });
            const existingSheets = metaResponse.data.sheets || [];
            const batchRequests = [];
            for (const target of targets) {
                const sheet = existingSheets.find((s) => s.properties.title === target.sheetName);
                const targetRowCount = target.existingCodes.size === 0
                    ? Math.max(target.allRows.length + 1000, 1000)
                    : Math.max(target.existingCodes.size + target.newRows.length + 1000, 1000);
                if (!sheet) {
                    this.logger.log(`Scheduling creation of sheet "${target.sheetName}" with ${targetRowCount} rows and 10 columns`);
                    batchRequests.push({
                        addSheet: {
                            properties: {
                                title: target.sheetName,
                                gridProperties: {
                                    rowCount: targetRowCount,
                                    columnCount: 10
                                }
                            }
                        }
                    });
                }
                else {
                    const currentRows = sheet.properties.gridProperties?.rowCount || 0;
                    const currentCols = sheet.properties.gridProperties?.columnCount || 0;
                    const needResizeRows = currentRows < targetRowCount;
                    const needResizeCols = currentCols !== 10;
                    if (needResizeRows || needResizeCols) {
                        this.logger.log(`Resizing sheet "${target.sheetName}": rows ${currentRows} -> ${Math.max(currentRows, targetRowCount)}, cols ${currentCols} -> 10`);
                        batchRequests.push({
                            updateSheetProperties: {
                                properties: {
                                    sheetId: sheet.properties.sheetId,
                                    gridProperties: {
                                        rowCount: Math.max(currentRows, targetRowCount),
                                        columnCount: 10
                                    }
                                },
                                fields: 'gridProperties.rowCount,gridProperties.columnCount'
                            }
                        });
                    }
                }
            }
            const defaultSheet = existingSheets.find((s) => s.properties.sheetId === 0 &&
                (s.properties.title === 'Trang tính1' || s.properties.title === 'Sheet1'));
            const hasOtherSheets = existingSheets.some((s) => s.properties.sheetId !== 0) || batchRequests.length > 0;
            if (defaultSheet && hasOtherSheets) {
                batchRequests.push({
                    deleteSheet: {
                        sheetId: defaultSheet.properties.sheetId
                    }
                });
            }
            if (batchRequests.length > 0) {
                this.logger.log(`Initializing and resizing sheets on Google Spreadsheet...`);
                await axios_1.default.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, { requests: batchRequests }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
            }
        }
        catch (metadataError) {
            this.logger.error(`Failed to ensure sheet structure or resize: ${metadataError.message}`, metadataError.stack);
        }
        let totalTazaCount = 0;
        let totalTimonaCount = 0;
        for (const target of targets) {
            const isTaza = target.sheetName.toLowerCase().startsWith('taza');
            const countAdded = target.existingCodes.size === 0 ? target.allRows.length : target.newRows.length;
            if (isTaza) {
                totalTazaCount += countAdded;
            }
            else {
                totalTimonaCount += countAdded;
            }
            const values = [headers, ...target.allRows.map(formatRowData)];
            const newValues = target.newRows.map(formatRowData);
            if (target.existingCodes.size === 0) {
                this.logger.log(`Clearing and writing all ${target.allRows.length} rows to ${target.sheetName}`);
                const rangeToClear = `'${target.sheetName}'!A:Z`;
                await axios_1.default.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeToClear)}:clear`, {}, { headers: { Authorization: `Bearer ${token}` } });
                await writeInChunks(target.sheetName, values);
            }
            else if (target.newRows.length > 0) {
                this.logger.log(`Appending ${target.newRows.length} new rows to ${target.sheetName}`);
                try {
                    const sheetMeta = await axios_1.default.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, { headers: { Authorization: `Bearer ${token}` } });
                    const sheetInfo = (sheetMeta.data.sheets || []).find((s) => s.properties.title === target.sheetName);
                    if (sheetInfo) {
                        const currentRows = sheetInfo.properties.gridProperties?.rowCount || 0;
                        const neededRows = target.existingCodes.size + target.newRows.length + 100;
                        if (currentRows < neededRows) {
                            this.logger.log(`Auto-resizing "${target.sheetName}": ${currentRows} -> ${neededRows} rows`);
                            await axios_1.default.post(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, { requests: [{ updateSheetProperties: { properties: { sheetId: sheetInfo.properties.sheetId, gridProperties: { rowCount: neededRows, columnCount: 10 } }, fields: 'gridProperties.rowCount,gridProperties.columnCount' } }] }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
                        }
                    }
                }
                catch (resizeErr) {
                    this.logger.error(`Auto-resize failed for "${target.sheetName}": ${resizeErr.message}`);
                }
                await appendInChunks(target.sheetName, newValues);
            }
            else {
                this.logger.log(`No new rows to append for ${target.sheetName}`);
            }
        }
        return {
            tazaCount: totalTazaCount,
            timonaCount: totalTimonaCount,
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
    async handleGoogleSheetPushCron22() {
        await this.handleGoogleSheetPushCron(true);
    }
    async handleGoogleSheetPushCron2330() {
        await this.handleGoogleSheetPushCron(false);
    }
    async handleGoogleSheetPushCron(shouldDuplicateBackup = false) {
        const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleGoogleSheetPushCron' } }).catch(() => null);
        if (config && !config.enabled) {
            this.logger.log('[CRON] handleGoogleSheetPushCron bị vô hiệu hóa trong cấu hình.');
            return;
        }
        this.logger.log(`[CRON] Bắt đầu tự động đẩy dữ liệu báo cáo lịch hẹn lên Google Sheets (backup: ${shouldDuplicateBackup})...`);
        try {
            const toStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
            const oldSheetId = '1G_R_JeKOQhvKj_F_fXmfSfsgIupYyJmgvq22s2Jk7GU';
            const oldFromStr = '2026-01-01';
            this.logger.log(`[CRON] [Old Sheet] Khoảng ngày tự động đẩy: ${oldFromStr} -> ${toStr}`);
            try {
                const resultOld = await this.pushToGoogleSheet(oldFromStr, toStr, oldSheetId, false, shouldDuplicateBackup);
                const msgOld = `[Old Sheet] Đẩy dữ liệu thành công! Taza: ${resultOld.tazaCount} dòng, Timona: ${resultOld.timonaCount} dòng.`;
                this.logger.log(`[CRON] ${msgOld}`);
                await this.prisma.crawlLog.create({
                    data: {
                        crawl_date: new Date(),
                        crawl_type: 'handleGoogleSheetPushCron_Old',
                        status: 'success',
                        message: msgOld,
                    }
                }).catch(err => this.logger.error(`Lỗi ghi crawlLog cho Old Sheet: ${err.message}`));
            }
            catch (errOld) {
                this.logger.error(`[CRON] [Old Sheet] Lỗi khi tự động đẩy dữ liệu: ${errOld.message}`, oldSheetId, errOld.stack);
                await this.prisma.crawlLog.create({
                    data: {
                        crawl_date: new Date(),
                        crawl_type: 'handleGoogleSheetPushCron_Old',
                        status: 'failed',
                        error_message: errOld.message,
                    }
                }).catch(err => this.logger.error(`Lỗi ghi crawlLog cho Old Sheet: ${err.message}`));
            }
        }
        catch (e) {
            this.logger.error(`[CRON] Lỗi chung khi tự động đẩy dữ liệu lên Google Sheets: ${e.message}`, e.stack);
        }
    }
};
exports.ExcelExportService = ExcelExportService;
__decorate([
    (0, schedule_1.Cron)('0 0 22 * * *', {
        timeZone: 'Asia/Ho_Chi_Minh',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExcelExportService.prototype, "handleGoogleSheetPushCron22", null);
__decorate([
    (0, schedule_1.Cron)('0 30 23 * * *', {
        timeZone: 'Asia/Ho_Chi_Minh',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExcelExportService.prototype, "handleGoogleSheetPushCron2330", null);
exports.ExcelExportService = ExcelExportService = ExcelExportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExcelExportService);
//# sourceMappingURL=excel-export.service.js.map