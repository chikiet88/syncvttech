import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '1GW8hVnHnT0LzLOxbFzt9PWdJwzKWMYX1_H6UnJdapUw';
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../google-service-account.json');
const BATCH_SIZE = 5000;

const prisma = new PrismaClient();

function formatBirthday(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
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
  return `${hh}:${mm} ${d}-${m}-${y}`;
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
  console.log('🚀 Step 1: Querying customers and appointments from DB since 01/01/2024...');
  const boundaryDate = new Date('2024-01-01T00:00:00.000Z');

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

  const totalCount = customers.length;
  console.log(`   Found ${totalCount} customers in total since 01/01/2024.`);

  // Group by year
  console.log('📦 Step 2: Grouping customers by creation year...');
  const groupedCustomers: { [key: number]: typeof customers } = {};
  for (const c of customers) {
    const creationDate = c.crm_created_at || c.created_at;
    if (!creationDate) continue;
    const year = creationDate.getFullYear();
    if (!groupedCustomers[year]) {
      groupedCustomers[year] = [];
    }
    groupedCustomers[year].push(c);
  }

  const years = Object.keys(groupedCustomers).map(Number).sort((a, b) => a - b);
  console.log(`   Grouped into years: ${years.join(', ')}`);
  for (const year of years) {
    console.log(`     - Year ${year}: ${groupedCustomers[year].length} customers`);
  }

  console.log('🔐 Step 3: Authenticating with Google Sheets API...');
  const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Get current sheets
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = meta.data.sheets || [];
  const existingTitles = new Set(existingSheets.map(s => s.properties?.title));

  console.log('🛠️ Step 4: Ensuring year sheets exist...');
  // Create missing sheets
  for (const year of years) {
    const sheetTitle = String(year);
    if (!existingTitles.has(sheetTitle)) {
      console.log(`   Creating sheet "${sheetTitle}"...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        },
      });
      existingTitles.add(sheetTitle);
    }
  }

  // Refresh sheets list to get all sheetIds
  const updatedMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allSheets = updatedMeta.data.sheets || [];
  const sheetMap = new Map(allSheets.map(s => [s.properties?.title, s.properties?.sheetId]));

  console.log('📤 Step 5: Pushing data to sheets...');
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

  for (const year of years) {
    const sheetTitle = String(year);
    const sheetId = sheetMap.get(sheetTitle);
    if (sheetId === undefined) continue;

    console.log(`\n📅 Processing year: ${sheetTitle} (${groupedCustomers[year].length} rows)...`);

    // Format data rows
    const dataRows = groupedCustomers[year].map(c => {
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
        formatDateTime(creationDate)
      ];
    });

    const allRows = [header, ...dataRows];
    const totalRows = allRows.length;

    // Step 5.1: Expand grid
    console.log(`   Expanding grid for "${sheetTitle}" to ${totalRows} rows...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
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

    // Step 5.2: Clear existing values
    console.log(`   Clearing grid for "${sheetTitle}"...`);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetTitle}'!A1:I`,
    });

    // Step 5.3: Write values in batches
    console.log(`   Writing data for "${sheetTitle}"...`);
    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = allRows.slice(i, Math.min(i + BATCH_SIZE, totalRows));
      const startRow = i + 1;
      const endRow = startRow + batch.length - 1;
      const range = `'${sheetTitle}'!A${startRow}:I${endRow}`;

      const batchEnd = Math.min(i + BATCH_SIZE, totalRows);
      console.log(`     Pushing rows ${startRow} → ${batchEnd}...`);

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: batch,
        },
      });

      if (i + BATCH_SIZE < totalRows) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Step 5.4: Apply formatting
    console.log(`   Applying formatting for "${sheetTitle}"...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          // Header style (Col A to I)
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
          // Freeze header
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: {
                  frozenRowCount: 1,
                },
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
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(horizontalAlignment)',
            },
          },
          // Align center for CHI NHÁNH, LỊCH HẸN ĐẦU TIÊN, LỊCH HẸN ĐẾN ĐẦU TIÊN, NGÀY TẠO (Col F to I)
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
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(horizontalAlignment)',
            },
          },
          // Basic filter
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

  // Step 6: Delete the default "Trang tính1" sheet if it exists
  const defaultSheetTitle = 'Trang tính1';
  const defaultSheetId = sheetMap.get(defaultSheetTitle);
  if (defaultSheetId !== undefined && allSheets.length > 1) {
    console.log(`\n🧹 Step 6: Deleting default sheet "${defaultSheetTitle}"...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteSheet: {
              sheetId: defaultSheetId,
            },
          },
        ],
      },
    });
    console.log('   ✅ Deleted');
  }

  console.log(`\n🎉 ALL DONE!`);
  console.log(`📊 Pushed total of ${totalCount} customer records.`);
  console.log(`🔗 Spreadsheet Link: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error occurred:', err.message || err);
  if (err.response?.data) {
    console.error('   Details:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
