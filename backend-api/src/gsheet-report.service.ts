import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GsheetReportService {
  private readonly logger = new Logger(GsheetReportService.name);
  private readonly SPREADSHEET_ID = '1GW8hVnHnT0LzLOxbFzt9PWdJwzKWMYX1_H6UnJdapUw';
  private readonly BATCH_SIZE = 5000;

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 7 * * *', {
    timeZone: 'Asia/Ho_Chi_Minh'
  })
  async handleDailyGsheetReportCron() {
    this.logger.log('⏰ [CRON] Khởi chạy cron job so sánh và đẩy báo cáo Google Sheets (07:00 AM)...');
    
    // Check if cron is enabled in database configs
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
    } catch (err: any) {
      this.logger.error(`❌ [CRON ERROR] Đồng bộ thất bại: ${err.message}`);
    }
  }

  async getReports(limit: number = 50) {
    return this.prisma.gsheetReport.findMany({
      orderBy: { report_date: 'desc' },
      take: limit,
    });
  }

  async getReportById(id: number) {
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
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const boundaryDate = new Date('2024-01-01T00:00:00.000Z');

    // 1. Fetch DB Customers since 01/01/2024
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

    // Group by year
    const dbGrouped: { [key: number]: typeof dbCustomers } = {};
    for (const c of dbCustomers) {
      const creationDate = c.crm_created_at || c.created_at;
      if (!creationDate) continue;
      const year = creationDate.getFullYear();
      if (!dbGrouped[year]) dbGrouped[year] = [];
      dbGrouped[year].push(c);
    }

    // Get current sheets from spreadsheet to compare
    const meta = await sheets.spreadsheets.get({ spreadsheetId: this.SPREADSHEET_ID });
    const existingSheets = meta.data.sheets || [];
    const sheetTitles = existingSheets.map(s => s.properties?.title || '');

    // 2. Read sheet rows and do comparison
    const yearsToCheck = [2024, 2025, 2026];
    let totalSheetCount = 0;
    let totalDifference = 0;
    
    let mdReport = `# Báo cáo So sánh dữ liệu Database và Google Sheets\n`;
    mdReport += `*Thời gian thực hiện: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}*\n\n`;
    mdReport += `## 1. Tổng quan số lượng bản ghi\n\n`;
    mdReport += `| Năm | Số lượng trên Sheet | Số lượng trong DB | Chênh lệch (DB - Sheet) | Trạng thái |\n`;
    mdReport += `| :---: | :---: | :---: | :---: | :---: |\n`;

    const newRecordsList: string[] = [];

    for (const year of yearsToCheck) {
      const sheetTitle = String(year);
      const dbCount = dbGrouped[year]?.length || 0;
      let sheetCount = 0;
      const sheetPhones = new Set<string>();

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
            if (phone) sheetPhones.add(phone);
          }
        } catch (e: any) {
          this.logger.error(`Lỗi đọc sheet ${sheetTitle}: ${e.message}`);
        }
      }

      const diff = dbCount - sheetCount;
      if (diff > 0) totalDifference += diff;
      const status = diff === 0 ? '✅ Trùng khớp' : (diff > 0 ? `⚠️ Có ${diff} bản ghi mới` : `🚨 Sheet thừa ${Math.abs(diff)} bản ghi`);

      mdReport += `| **${year}** | ${sheetCount.toLocaleString()} | ${dbCount.toLocaleString()} | ${diff > 0 ? '+' : ''}${diff.toLocaleString()} | ${status} |\n`;

      // Identify up to 10 new records
      if (diff > 0 && dbGrouped[year]) {
        let yearNewCount = 0;
        newRecordsList.push(`### Lịch sử các bản ghi mới phát sinh trong năm ${year}:\n`);
        newRecordsList.push(`| STT | Họ tên khách hàng | Số điện thoại | Ngày tạo |\n`);
        newRecordsList.push(`| :---: | :--- | :---: | :---: |\n`);

        for (const c of dbGrouped[year]) {
          let dbPhone = c.phone || '';
          if (dbPhone && !dbPhone.startsWith('0')) dbPhone = '0' + dbPhone;

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
    } else {
      mdReport += `Phát hiện tổng cộng **${totalDifference}** khách hàng mới được tạo trong database chưa được đẩy lên Google Sheets.\n\n`;
      mdReport += newRecordsList.join('');
    }

    // 3. Save report to PostgreSQL
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

    // 4. If there's new data or we are syncing, push updated sheets
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

    // Ensure all target year sheets exist
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

    // Refresh sheet metadata to get sheet IDs
    const updatedMeta = await sheets.spreadsheets.get({ spreadsheetId: this.SPREADSHEET_ID });
    const allSheets = updatedMeta.data.sheets || [];
    const sheetMap = new Map(allSheets.map(s => [s.properties?.title, s.properties?.sheetId]));

    for (const year of years) {
      const sheetTitle = String(year);
      const sheetId = sheetMap.get(sheetTitle);
      if (sheetId === undefined) continue;

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

      // Expand Grid
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

      // Clear contents
      await sheets.spreadsheets.values.clear({
        spreadsheetId: this.SPREADSHEET_ID,
        range: `'${sheetTitle}'!A1:I`,
      });

      // Write in batches
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

      // Format Year Sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.SPREADSHEET_ID,
        requestBody: {
          requests: [
            // Bold header + background color + align center (Col A to I)
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
            // Freeze header row
            {
              updateSheetProperties: {
                properties: {
                  sheetId,
                  gridProperties: { frozenRowCount: 1 },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
            // Auto resize columns A to I
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
            // Align center for GIỚI TÍNH, SINH NHẬT (Col C, D)
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
            // Align center for CHI NHÁNH, LỊCH HẸN, LỊCH HẸN ĐẾN, NGÀY TẠO (Col F to I)
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
            // Add basic filter
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

    // Clean up default sheet "Trang tính1" if it exists
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

    // Record crawlLog in database as well for operational monitoring
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

  private formatDateTime(date: Date | null): string {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${d}-${m}-${y} ${hh}:${mm}:${ss}`;
  }
}

// Helpers
function formatBirthday(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  if (y === 1900 || y === 1899) return '';
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}-${m}-${y}`;
}

function formatGender(gender: number | null): string {
  if (gender === 60) return 'NAM';
  if (gender === 61) return 'NỮ';
  return '';
}

function formatDateTimeMin(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} ${d}-${m}-${y}`;
}

function formatAppointment(app: any): string {
  if (!app) return '';
  const code = app.vttech_code || `ID#${app.id}`;
  const dateStr = formatDateTimeMin(app.appointment_date);
  
  let statusText = app.status_name || '';
  if (!statusText) {
    if (app.status === 1) statusText = 'Đặt Hẹn';
    else if (app.status === 2) statusText = 'Đã Đến';
    else if (app.status === 3) statusText = 'Đã Hủy';
    else statusText = `Trạng thái #${app.status}`;
  }
  
  return `${code} - ${dateStr} - ${statusText}`;
}
