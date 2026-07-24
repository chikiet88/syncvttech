import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '1GW8hVnHnT0LzLOxbFzt9PWdJwzKWMYX1_H6UnJdapUw';
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../google-service-account.json');
const REPORT_PATH = path.resolve(__dirname, '../../docs/pushdulieumoihangngay/compare_diff.md');

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Authenticating with Google Sheets API...');
  const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('📊 Fetching spreadsheet metadata...');
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetList = meta.data.sheets || [];
  const sheetTitles = sheetList.map(s => s.properties?.title || '');
  console.log('Existing sheets in spreadsheet:', sheetTitles);

  const boundaryDate = new Date('2024-01-01T00:00:00.000Z');
  
  // 1. Query all customers from DB since 01/01/2024
  console.log('📦 Fetching customer data from DB...');
  const dbCustomers = await prisma.customer.findMany({
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
    select: {
      name: true,
      phone: true,
      crm_created_at: true,
      created_at: true
    }
  });

  // Group DB customers by year
  const dbGrouped: { [key: number]: typeof dbCustomers } = {};
  for (const c of dbCustomers) {
    const date = c.crm_created_at || c.created_at;
    if (!date) continue;
    const year = date.getFullYear();
    if (!dbGrouped[year]) dbGrouped[year] = [];
    dbGrouped[year].push(c);
  }

  // 2. Read sheets data
  const sheetGrouped: { [key: number]: { count: number; phones: Set<string> } } = {};
  
  let reportMarkdown = `# Báo cáo So sánh dữ liệu Database và Google Sheets\n`;
  reportMarkdown += `*Thời gian thực hiện: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}*\n\n`;
  reportMarkdown += `## 1. Tổng quan số lượng bản ghi\n\n`;
  reportMarkdown += `| Năm | Số lượng trên Sheet | Số lượng trong DB | Chênh lệch (DB - Sheet) | Trạng thái |\n`;
  reportMarkdown += `| :---: | :---: | :---: | :---: | :---: |\n`;

  const yearsToCheck = [2024, 2025, 2026];
  let totalNewRecords = 0;
  const newRecordsList: string[] = [];

  for (const year of yearsToCheck) {
    const sheetTitle = String(year);
    const dbCount = dbGrouped[year]?.length || 0;
    
    let sheetCount = 0;
    const sheetPhones = new Set<string>();

    if (sheetTitles.includes(sheetTitle)) {
      console.log(`📖 Reading data for year ${year} from sheet...`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetTitle}'!A2:B`, // Read Name and Phone
      });
      const rows = response.data.values || [];
      sheetCount = rows.length;
      
      for (const row of rows) {
        let phone = row[1] || '';
        // Normalize phone number (strip leading single quote if present)
        phone = phone.replace(/^'/, '').trim();
        if (phone) sheetPhones.add(phone);
      }
    }

    sheetGrouped[year] = { count: sheetCount, phones: sheetPhones };
    const diff = dbCount - sheetCount;
    const status = diff === 0 ? '✅ Trùng khớp' : (diff > 0 ? `⚠️ Có ${diff} bản ghi mới` : `🚨 Sheet thừa ${Math.abs(diff)} bản ghi`);
    
    reportMarkdown += `| **${year}** | ${sheetCount.toLocaleString()} | ${dbCount.toLocaleString()} | ${diff > 0 ? '+' : ''}${diff.toLocaleString()} | ${status} |\n`;

    // If there are new records, identify them
    if (diff > 0 && dbGrouped[year]) {
      let yearNewCount = 0;
      newRecordsList.push(`### Lịch sử các bản ghi mới phát sinh trong năm ${year}:\n`);
      newRecordsList.push(`| STT | Họ tên khách hàng | Số điện thoại | Ngày tạo |\n`);
      newRecordsList.push(`| :---: | :--- | :---: | :---: |\n`);

      for (const c of dbGrouped[year]) {
        let dbPhone = c.phone || '';
        // Normalize DB phone (ensure it has leading 0, or matches sheet formatting)
        if (dbPhone && !dbPhone.startsWith('0')) {
          dbPhone = '0' + dbPhone;
        }
        
        if (!sheetPhones.has(dbPhone)) {
          yearNewCount++;
          totalNewRecords++;
          const dateStr = formatDateTime(c.crm_created_at || c.created_at);
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

  reportMarkdown += `\n`;
  reportMarkdown += `## 2. Chi tiết các bản ghi mới cần push bổ sung\n\n`;
  if (totalNewRecords === 0) {
    reportMarkdown += `Không phát sinh thêm khách hàng mới kể từ lần đồng bộ trước. Dữ liệu trên Google Sheet hiện tại đã trùng khớp 100% với Database.\n`;
  } else {
    reportMarkdown += `Phát hiện tổng cộng **${totalNewRecords}** khách hàng mới được tạo trong database chưa được đẩy lên Google Sheets.\n\n`;
    reportMarkdown += newRecordsList.join('');
  }

  // Ensure directory exists
  const dir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(REPORT_PATH, reportMarkdown, 'utf-8');
  console.log(`\n📝 Markdown report written to: ${REPORT_PATH}`);
  console.log(reportMarkdown);

  await prisma.$disconnect();
}

function formatDateTime(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${d}-${m}-${y} ${hh}:${mm}:${ss}`;
}

main().catch((err) => {
  console.error('❌ Error occurred:', err.message || err);
  process.exit(1);
});
