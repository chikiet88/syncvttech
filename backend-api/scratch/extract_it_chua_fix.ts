import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '14Q4MXk5l1ZgDXemDPBe0PCDIOlLbBgKuY7Vi2kugvpw';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'google-service-account.json');

// Sheet configs: sheetName -> { headerRow, noteCol (where "IT CHƯA FIX" is), statusCol }
// Based on exploration: most sheets have header at row 1, and "IT CHƯA FIX" is in NOTE column
// Some sheets have different column layouts

interface SheetConfig {
  headerRow: number; // 0-indexed
  itChuaFixCol: number; // the column where "IT CHƯA FIX" appears
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allSheets = spreadsheet.data.sheets || [];

  // Target sheets with known "IT CHƯA FIX" occurrences
  const targetSheets = [
    'TAZA QUẬN 10', 'TIMONA CMT8', 'CN GÒ VẤP', 'BÌNH TÂN', 'CN THÙ ĐỨC', 'TÂN PHÚ'
  ];

  const allResults: any[] = [];

  for (const sheetMeta of allSheets) {
    const sheetName = sheetMeta.properties?.title;
    if (!sheetName || !targetSheets.includes(sheetName)) continue;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 3) continue;

    // Find header row (row 1 in most sheets)
    const headerRow = rows[1]; // row index 1

    // Find all rows where any cell contains "IT CHƯA FIX"
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      let hasItChuaFix = false;
      let itChuaFixColIdx = -1;
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || '').trim().toUpperCase();
        if (val.includes('IT CHƯA FIX')) {
          hasItChuaFix = true;
          itChuaFixColIdx = j;
          break;
        }
      }

      if (!hasItChuaFix) continue;

      // Build row data using header
      const rowData: Record<string, string> = {};
      rowData['Chi nhánh'] = sheetName;
      rowData['Dòng Excel'] = String(i + 1);

      for (let j = 0; j < headerRow.length; j++) {
        const headerKey = String(headerRow[j] || '').trim();
        if (!headerKey) continue;
        const cellValue = String(row[j] || '').trim();
        if (cellValue) {
          rowData[headerKey] = cellValue;
        }
      }

      allResults.push(rowData);
      console.log(`Sheet "${sheetName}", Row ${i + 1}: Found IT CHƯA FIX`);
    }
  }

  console.log(`\nTotal: ${allResults.length} rows with "IT CHƯA FIX"`);

  // Write full JSON
  const outputPath = path.join(__dirname, 'it_chua_fix_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2), 'utf-8');
  console.log(`Written to: ${outputPath}`);

  // Print all rows
  allResults.forEach((row, idx) => {
    console.log(`\n--- #${idx + 1} (${row['Chi nhánh']}, Row ${row['Dòng Excel']}) ---`);
    Object.entries(row).forEach(([key, val]) => {
      console.log(`  ${key}: ${val}`);
    });
  });
}

main().catch(console.error);
