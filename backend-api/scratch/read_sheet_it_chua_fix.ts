import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '14Q4MXk5l1ZgDXemDPBe0PCDIOlLbBgKuY7Vi2kugvpw';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'google-service-account.json');

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get all sheets
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const allSheets = spreadsheet.data.sheets || [];
  console.log(`Found ${allSheets.length} sheets:`);
  allSheets.forEach((s) => {
    console.log(`  - "${s.properties?.title}" (GID: ${s.properties?.sheetId})`);
  });

  // Now read ALL sheets and search for "IT Chưa Fix" value
  const allItChuaFixRows: any[] = [];

  for (const sheetMeta of allSheets) {
    const sheetName = sheetMeta.properties?.title;
    if (!sheetName) continue;

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'`,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) continue;

      // Find header row - look at first few rows for the actual header
      let headerRowIndex = -1;
      let headerRow: string[] = [];

      // Look for "Tình trạng" or status-like columns in first 10 rows
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        if (row) {
          const hasStatus = row.some(
            (cell: string) =>
              cell &&
              (String(cell).toLowerCase().includes('tình trạng') ||
                String(cell).toLowerCase().includes('tinh trang')),
          );
          if (hasStatus) {
            headerRowIndex = i;
            headerRow = row.map((c: any) => String(c || '').trim());
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        // Try a different approach: search for "IT Chưa Fix" in any cell
        let found = false;
        for (let i = 0; i < rows.length; i++) {
          for (let j = 0; j < (rows[i]?.length || 0); j++) {
            const val = String(rows[i][j] || '');
            if (val.includes('IT Chưa Fix') || val.includes('IT chưa fix') || val.includes('IT CHƯA FIX')) {
              console.log(`\n  Sheet "${sheetName}": Found "IT Chưa Fix" at row ${i + 1}, col ${j}`);
              found = true;
              break;
            }
          }
          if (found) break;
        }
        continue;
      }

      // Found header, now find status column index
      const statusColIndex = headerRow.findIndex(
        (col: string) =>
          col.toLowerCase().includes('tình trạng') ||
          col.toLowerCase().includes('tinh trang'),
      );

      if (statusColIndex === -1) continue;

      // Filter "IT Chưa Fix" rows
      let count = 0;
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const status = String(row[statusColIndex] || '').trim();
        if (status.toLowerCase().includes('it chưa fix')) {
          count++;
          const obj: Record<string, string> = {};
          headerRow.forEach((col: string, idx: number) => {
            if (col) {
              obj[col] = String(row[idx] || '').trim();
            }
          });
          obj['__sheetName'] = sheetName;
          obj['__rowIndex'] = String(i + 1);
          allItChuaFixRows.push(obj);
        }
      }

      if (count > 0) {
        console.log(`\n  Sheet "${sheetName}": ${count} rows with "IT Chưa Fix"`);
        // Show unique status values for reference
        const statuses = new Set<string>();
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const s = String(rows[i]?.[statusColIndex] || '').trim();
          if (s) statuses.add(s);
        }
        console.log(`    All statuses: ${Array.from(statuses).join(' | ')}`);
        console.log(`    Header: ${headerRow.filter(Boolean).join(' | ')}`);
      }
    } catch (err: any) {
      console.error(`  Error reading sheet "${sheetName}":`, err.message);
    }
  }

  console.log(`\n\n=== TOTAL: ${allItChuaFixRows.length} rows with "IT Chưa Fix" across all sheets ===`);

  // Write output
  const outputPath = path.join(__dirname, 'it_chua_fix_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allItChuaFixRows, null, 2), 'utf-8');
  console.log(`Data written to: ${outputPath}`);

  // Print sample
  if (allItChuaFixRows.length > 0) {
    console.log('\n=== SAMPLE (first 3 rows) ===');
    allItChuaFixRows.slice(0, 3).forEach((row, idx) => {
      console.log(`\n--- Row ${idx + 1} (Sheet: ${row.__sheetName}, Excel Row: ${row.__rowIndex}) ---`);
      Object.entries(row).forEach(([key, val]) => {
        if (val && !key.startsWith('__')) console.log(`  ${key}: ${val}`);
      });
    });
  }
}

main().catch(console.error);
