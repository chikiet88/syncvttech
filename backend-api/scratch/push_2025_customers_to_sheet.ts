import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '1GW8hVnHnT0LzLOxbFzt9PWdJwzKWMYX1_H6UnJdapUw';
const SHEET_NAME = 'Trang tính1';
const SHEET_ID = 0;
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../google-service-account.json');
const BATCH_SIZE = 5000;

const prisma = new PrismaClient();

function formatBirthday(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  // Filter out default placeholder years (1900 or 1899)
  if (y === 1900 || y === 1899) return '';
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}-${m}-${y}`;
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

function formatDateTimeMin(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} ${d}-${m}-${y}`; // Modified format: HH:mm DD-MM-YYYY
}

function formatGender(gender: number | null): string {
  if (gender === 60) return 'NAM';
  if (gender === 61) return 'NỮ';
  return '';
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

async function main() {
  console.log('🚀 Step 1: Querying customers and appointments from DB...');
  const boundaryDate = new Date('2025-01-01T00:00:00.000Z');

  // Query customers with CRM creation date >= 2025-01-01
  // OR CRM creation date is null but synced date >= 2025-01-01
  const customers = await prisma.customer.findMany({
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

  const totalCount = customers.length;
  console.log(`   Found ${totalCount} customers to push.`);

  console.log('🔐 Step 2: Authenticating with Google Sheets API...');
  const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Prepare header and data rows
  const header = [
    'Tên', 
    'Phone', 
    'GIỚI TÍNH', 
    'SINH NHẬT', 
    'CHI NHÁNH', 
    'LỊCH HẸN ĐẦU TIÊN', 
    'LỊCH HẸN ĐẾN ĐẦU TIÊN', 
    'NGÀY TẠO'
  ];
  
  const dataRows = customers.map(c => {
    // Prefix phone with a single quote to force Google Sheets to treat it as Text
    // and preserve the leading zero
    const phoneStr = c.phone ? (c.phone.startsWith('0') ? `'${c.phone}` : `'0${c.phone}`) : '';
    const creationDate = c.crm_created_at || c.created_at;
    
    // Earliest appointment
    const firstApp = c.appointments.length > 0 ? c.appointments[0] : null;
    
    // Earliest check-in / attended appointment (status = 2)
    const firstAttendedApp = c.appointments.find(app => app.status === 2) || null;

    return [
      c.name || '',
      phoneStr,
      formatGender(c.gender),
      formatBirthday(c.birthday),
      c.branch?.name || '',
      formatAppointment(firstApp),
      formatAppointment(firstAttendedApp),
      formatDateTime(creationDate)
    ];
  });

  const allRows = [header, ...dataRows];
  const totalRows = allRows.length; // header + data

  console.log(`📐 Step 3: Expanding Google Sheet grid to ${totalRows} rows...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: SHEET_ID,
              gridProperties: {
                rowCount: Math.max(1000, totalRows + 100),
                columnCount: 8,
              },
            },
            fields: 'gridProperties(rowCount,columnCount)',
          },
        },
      ],
    },
  });
  console.log('   ✅ Expanded grid');

  console.log('🧹 Step 4: Clearing existing content...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A1:H`,
  });
  console.log('   ✅ Cleared');

  console.log('📤 Step 5: Pushing data in batches...');
  for (let i = 0; i < totalRows; i += BATCH_SIZE) {
    const batch = allRows.slice(i, Math.min(i + BATCH_SIZE, totalRows));
    const startRow = i + 1;
    const endRow = startRow + batch.length - 1;
    const range = `'${SHEET_NAME}'!A${startRow}:H${endRow}`;

    const batchEnd = Math.min(i + BATCH_SIZE, totalRows);
    console.log(`   Pushing rows ${startRow} → ${batchEnd}...`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED', // Important: USER_ENTERED parses the single quote properly
      requestBody: {
        values: batch,
      },
    });

    // Short pause between batches to avoid rate limits
    if (i + BATCH_SIZE < totalRows) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.log('   ✅ Pushed all data');

  console.log('🎨 Step 6: Formatting Sheet...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        // Bold header + background color + align center (Col A to H)
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 8,
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
              sheetId: SHEET_ID,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        // Auto resize columns A to H
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: SHEET_ID,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 8,
            },
          },
        },
        // Align center for GIỚI TÍNH, SINH NHẬT, LỊCH HẸN ĐẦU TIÊN, LỊCH HẸN ĐẾN ĐẦU TIÊN, and NGÀY TẠO columns (Col C to H)
        {
          repeatCell: {
            range: {
              sheetId: SHEET_ID,
              startRowIndex: 1,
              endRowIndex: totalRows,
              startColumnIndex: 2,
              endColumnIndex: 8,
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
              },
            },
            fields: 'userEnteredFormat(horizontalAlignment)',
          },
        },
        // Add basic filter to sheet
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId: SHEET_ID,
                startRowIndex: 0,
                endRowIndex: totalRows,
                startColumnIndex: 0,
                endColumnIndex: 8,
              },
            },
          },
        },
      ],
    },
  });
  console.log('   ✅ Formatting applied');

  console.log(`\n🎉 Process completed!`);
  console.log(`📊 Pushed ${totalCount} customer records to Google Sheets.`);
  console.log(`🔗 Sheet Link: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error occurred:', err.message || err);
  if (err.response?.data) {
    console.error('   Details:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
