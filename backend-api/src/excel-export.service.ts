import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as ExcelJS from 'exceljs';
import * as crypto from 'crypto';
import * as fs from 'fs';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ExcelExportService {
  private readonly logger = new Logger(ExcelExportService.name);

  constructor(private prisma: PrismaService) {}

  async getFormattedAppointmentsData(
    dateFromStr: string,
    dateToStr: string,
    branchId?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<any[]> {
    const parseDate = (dStr: string, isEnd: boolean) => {
      if (!dStr) return new Date();
      const separator = dStr.includes('/') ? '/' : '-';
      const parts = dStr.split(separator);
      let date: Date;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          date = new Date(dStr);
        } else {
          const [d, m, y] = parts;
          date = new Date(`${y}-${m}-${d}`);
        }
      } else {
        date = new Date(dStr);
      }
      
      if (isEnd) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date;
    };

    const start = parseDate(dateFromStr, false);
    const end = parseDate(dateToStr, true);

    this.logger.log(`Fetching appointments for formatting: ${start.toISOString()} to ${end.toISOString()} (Branch: ${branchId})`);

    const where: any = {};
    const whereAndConditions: any[] = [];

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
    } else if (branchId === 'timona') {
      whereAndConditions.push({
        branch: {
          name: { contains: 'Timona', mode: 'insensitive' },
        },
      });
    } else if (branchId && branchId !== '0') {
      whereAndConditions.push({ branch_id: parseInt(branchId) });
    } else {
      whereAndConditions.push({
        branch: {
          OR: [
            { name: { contains: 'Taza', mode: 'insensitive' } },
            { name: { contains: 'Timona', mode: 'insensitive' } },
          ],
        },
      });
    }

    // Status "Ra Về" filter
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

    // Type "Tư vấn" filter
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

    // Fetch appointments in range for Taza & Timona branches
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
          appointment_date: sortOrder,
        },
      }),
      this.prisma.service.findMany({ select: { id: true, name: true, group_id: true } }),
      this.prisma.serviceGroup.findMany({ select: { id: true, name: true } }),
    ]);

    const serviceMap = new Map(services.map(s => [s.id, s]));
    const groupMap = new Map(groups.map(g => [g.id, g.name]));

    // Extract unique creator IDs to fetch user/employee names in a single query (CreatedID is User ID on VTTech)
    const creatorIds = [...new Set(appointments.map(a => a.created_by_id).filter(Boolean))] as number[];
    const employeeMap = new Map<number, string>();
    if (creatorIds.length > 0) {
      // 1. Fetch from users table (which has full_name mapped to VTTech EmployeeName)
      const users = await this.prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, full_name: true },
      });
      users.forEach(u => {
        if (u.full_name) employeeMap.set(u.id, u.full_name);
      });

      // 2. Fallback to employees table for any IDs that are not in users mapping
      const missingIds = creatorIds.filter(id => !employeeMap.has(id));
      if (missingIds.length > 0) {
        const employees = await this.prisma.employee.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, name: true },
        });
        employees.forEach(e => {
          if (e.name) employeeMap.set(e.id, e.name);
        });
      }
    }

    // Format dates helper (Chỉ lấy ngày theo yêu cầu: DD-MM-YYYY)
    const formatExcelDateString = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Format creator time helper (Tên và giờ không có khoảng cách)
    const formatCreatorString = (creatorId: number | null, createdDate: Date | null): string => {
      const creatorName = creatorId ? (employeeMap.get(creatorId) || '') : '';
      if (!createdDate) return creatorName;
      
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
      
      // Col 2: MLH&KH
      const mlhKh = `${custCode}${custName}`;

      // Col 3: Ngày hẹn
      const appointmentDateStr = a.appointment_date 
        ? formatExcelDateString(a.appointment_date) 
        : '';

      // Col 9: TEN SALE&THỜI GIAN&NGÀY
      const saleTimeDate = formatCreatorString(a.created_by_id, a.vttech_created_at || a.appointment_date);

      // Col 10: Nguồn khách hàng
      const sourceName = customer?.source?.name || 'Khách Giới Thiệu';

      // Find funnel name
      let funnelName = '';
      const serviceNameLower = a.service_name?.toLowerCase().trim();
      const matchedGroup = groups.find(g => g.name.toLowerCase().trim() === serviceNameLower);
      if (matchedGroup) {
        funnelName = matchedGroup.name;
      } else {
        const service = a.service_id ? serviceMap.get(a.service_id) : null;
        if (service && service.name.toLowerCase().trim() === serviceNameLower) {
          funnelName = service.group_id ? groupMap.get(service.group_id) || '' : '';
        } else {
          // Fallback check if service_id maps directly to a group name in groupMap (for legacy data)
          const groupById = a.service_id ? groupMap.get(a.service_id) : null;
          if (groupById) {
            funnelName = groupById;
          } else if (service) {
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

  async exportAppointmentsToExcel(dateFromStr: string, dateToStr: string, branchId?: string): Promise<Buffer> {
    const formattedData = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, branchId, 'desc');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('LỊCH HẸN');

    // Setup headers
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

    // Format header style
    worksheet.getRow(1).font = { name: 'Inter', size: 10, bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

    // Populate data rows
    formattedData.forEach(row => {
      const addedRow = worksheet.addRow(row);

      // Style cell alignment and fonts
      addedRow.font = { name: 'Inter', size: 9 };
      addedRow.alignment = { vertical: 'middle', wrapText: true };
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
    return buffer;
  }

  async pushToGoogleSheet(dateFromStr: string, dateToStr: string): Promise<{ tazaCount: number, timonaCount: number, url: string }> {
    this.logger.log(`Pushing appointments to Google Sheets for range: ${dateFromStr} to ${dateToStr}`);

    // 1. Get credentials
    let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      let creds: any = null;
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
          creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        } catch (e) {
          this.logger.error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY env var: ${e.message}`);
        }
      }
      
      if (!creds && process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        try {
          if (fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH)) {
            creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
          }
        } catch (e) {
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
            } catch (e: any) {
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

    // 2. Authenticate
    const token = await this.getGoogleSheetsAccessToken(clientEmail, privateKey);

    // 3. Fetch data for Taza and Timona
    const tazaRows = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, 'taza', 'asc');
    const timonaRows = await this.getFormattedAppointmentsData(dateFromStr, dateToStr, 'timona', 'asc');

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

    const formatRowData = (row: any) => [
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

    // 4. Push to Taza Sheet
    this.logger.log(`Clearing and writing ${tazaRows.length} rows to Taza sheet`);
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!A:Z:clear`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await axios.put(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!A1?valueInputOption=USER_ENTERED`,
      { values: tazaValues },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    // 5. Push to Timona Sheet
    this.logger.log(`Clearing and writing ${timonaRows.length} rows to Timona sheet`);
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Timona!A:Z:clear`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await axios.put(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Timona!A1?valueInputOption=USER_ENTERED`,
      { values: timonaValues },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    return {
      tazaCount: tazaRows.length,
      timonaCount: timonaRows.length,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  private async getGoogleSheetsAccessToken(clientEmail: string, privateKey: string): Promise<string> {
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

    const base64UrlEncode = (obj: any) => {
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

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });

    return response.data.access_token;
  }

  @Cron('0 0 4,23 * * *', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleGoogleSheetPushCron() {
    const config = await this.prisma.cronConfig.findUnique({ where: { id: 'handleGoogleSheetPushCron' } }).catch(() => null);
    if (config && !config.enabled) {
      this.logger.log('[CRON] handleGoogleSheetPushCron bị vô hiệu hóa trong cấu hình.');
      return;
    }

    this.logger.log('[CRON] Bắt đầu tự động đẩy dữ liệu báo cáo lịch hẹn lên Google Sheets...');
    try {
      const now = new Date();
      // Format: YYYY-MM-DD
      const toStr = now.toISOString().split('T')[0];
      // Từ ngày 01/01/2026 đến nay
      const fromStr = '2026-01-01';

      this.logger.log(`[CRON] Khoảng ngày tự động đẩy: ${fromStr} -> ${toStr}`);
      const result = await this.pushToGoogleSheet(fromStr, toStr);
      const msg = `Tự động đẩy dữ liệu thành công! Taza: ${result.tazaCount} dòng, Timona: ${result.timonaCount} dòng.`;
      this.logger.log(`[CRON] ${msg}`);

      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleGoogleSheetPushCron',
          status: 'success',
          message: msg,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    } catch (e: any) {
      this.logger.error(`[CRON] Lỗi khi tự động đẩy dữ liệu lên Google Sheets: ${e.message}`, e.stack);
      await this.prisma.crawlLog.create({
        data: {
          crawl_date: new Date(),
          crawl_type: 'handleGoogleSheetPushCron',
          status: 'failed',
          error_message: e.message,
        }
      }).catch(err => this.logger.error(`Lỗi ghi crawlLog: ${err.message}`));
    }
  }
}
