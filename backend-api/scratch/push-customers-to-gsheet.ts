/**
 * Đẩy dữ liệu khách hàng từ CSV lên Google Sheets
 * Sheet: https://docs.google.com/spreadsheets/d/1xVkxWUPUSsfZ64Jhov5k3EOTrXT-QT3_PpNNSFFqFvI
 * Service Account: botcake@sandboxtazagroupvn.iam.gserviceaccount.com
 */
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '1xVkxWUPUSsfZ64Jhov5k3EOTrXT-QT3_PpNNSFFqFvI';
const SHEET_NAME = 'Trang tính1';
const SHEET_ID = 0;
const CSV_PATH = path.resolve(__dirname, '../../docs/report/ThongTin_KhachHang_2019-2022.csv');
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../google-service-account.json');

const BATCH_SIZE = 5000;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

async function main() {
  console.log('🔐 Đang xác thực với Google Sheets API...');

  const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Read & parse CSV
  console.log('📄 Đang đọc file CSV...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const cleanContent = csvContent.replace(/^\uFEFF/, '');
  const lines = cleanContent.split('\n').filter(line => line.trim() !== '');
  const totalLines = lines.length;
  console.log(`   Tổng: ${totalLines} dòng (1 header + ${totalLines - 1} dữ liệu)`);

  console.log('🔄 Đang parse CSV...');
  const allRows: any[][] = lines.map(line => parseCSVLine(line));

  // Step 1: Expand the grid to fit all rows + some buffer
  const requiredRows = totalLines + 100;
  console.log(`📐 Đang mở rộng grid lên ${requiredRows} dòng...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: SHEET_ID,
              gridProperties: {
                rowCount: requiredRows,
                columnCount: 20,
              },
            },
            fields: 'gridProperties(rowCount,columnCount)',
          },
        },
      ],
    },
  });
  console.log('   ✅ Đã mở rộng grid');

  // Step 2: Clear existing data
  console.log('🧹 Đang xóa dữ liệu cũ...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'`,
  });
  console.log('   ✅ Đã xóa');

  // Step 3: Push data in batches
  for (let i = 0; i < totalLines; i += BATCH_SIZE) {
    const batch = allRows.slice(i, Math.min(i + BATCH_SIZE, totalLines));
    const startRow = i + 1;
    const endRow = startRow + batch.length - 1;
    const range = `'${SHEET_NAME}'!A${startRow}:T${endRow}`;

    const batchEnd = Math.min(i + BATCH_SIZE, totalLines);
    console.log(`📤 Đẩy dòng ${i + 1} → ${batchEnd} (${batch.length} dòng)...`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: batch,
      },
    });

    console.log(`   ✅ ${batchEnd}/${totalLines}`);

    // Delay to avoid rate limits
    if (i + BATCH_SIZE < totalLines) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Step 4: Format header
  console.log('🎨 Đang format header...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        // Bold + color header
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.16, green: 0.38, blue: 0.71 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 10,
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        // Freeze header
        {
          updateSheetProperties: {
            properties: {
              sheetId: SHEET_ID,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: SHEET_ID,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 20,
            },
          },
        },
        // Add filter
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId: SHEET_ID,
                startRowIndex: 0,
                endRowIndex: totalLines,
                startColumnIndex: 0,
                endColumnIndex: 20,
              },
            },
          },
        },
      ],
    },
  });

  // Step 5: Rename sheet tab
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: SHEET_ID,
              title: 'DSKH 2019-2022',
            },
            fields: 'title',
          },
        },
      ],
    },
  });

  console.log(`\n🎉 Hoàn tất!`);
  console.log(`📊 Tổng: ${totalLines - 1} khách hàng đã đẩy lên Google Sheets`);
  console.log(`🔗 https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
}

main().catch((err) => {
  console.error('❌ Lỗi:', err.message || err);
  if (err.response?.data) {
    console.error('   Chi tiết:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
