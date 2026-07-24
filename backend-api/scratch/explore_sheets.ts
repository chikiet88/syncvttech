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
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allSheets = spreadsheet.data.sheets || [];

  // Read each sheet and dump first 10 rows + any status column
  for (const sheetMeta of allSheets) {
    const sheetName = sheetMeta.properties?.title;
    if (!sheetName) continue;

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'`,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        console.log(`\n=== "${sheetName}": Empty or single row ===`);
        continue;
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`SHEET: "${sheetName}" (${rows.length} rows, max ${Math.max(...rows.map(r => r?.length || 0))} cols)`);
      console.log(`${'='.repeat(60)}`);

      // Print first 6 rows to understand structure
      const printRows = Math.min(6, rows.length);
      for (let i = 0; i < printRows; i++) {
        const row = rows[i] || [];
        const cells = row.map((c: any, idx: number) => {
          const val = String(c || '').trim();
          return val ? `[${idx}]=${val.substring(0, 50)}` : '';
        }).filter(Boolean);
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }

      // Search for any cell containing "IT" in all rows
      const itCells: { row: number; col: number; value: string }[] = [];
      for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < (rows[i]?.length || 0); j++) {
          const val = String(rows[i][j] || '').trim();
          if (val.includes('IT Chưa Fix') || val.includes('IT chưa fix') || val.includes('IT CHƯA FIX')) {
            itCells.push({ row: i + 1, col: j, value: val.substring(0, 80) });
          }
        }
      }

      if (itCells.length > 0) {
        console.log(`\n  >>> FOUND "IT Chưa Fix" in ${itCells.length} cells:`);
        itCells.forEach(c => console.log(`    Row ${c.row}, Col ${c.col}: "${c.value}"`));
      }

      // Also search for any status-like pattern
      const statusPatterns = ['tình trạng', 'tinh trang', 'trạng thái', 'trang thai', 'status'];
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        for (let j = 0; j < (rows[i]?.length || 0); j++) {
          const val = String(rows[i][j] || '').toLowerCase().trim();
          if (statusPatterns.some(p => val.includes(p))) {
            console.log(`  >>> Status-like header at Row ${i}, Col ${j}: "${rows[i][j]}"`);
            // Collect unique values in this column
            const uniqVals = new Set<string>();
            for (let k = i + 1; k < rows.length; k++) {
              const v = String(rows[k]?.[j] || '').trim();
              if (v) uniqVals.add(v);
            }
            const vals = Array.from(uniqVals);
            console.log(`    Unique values (${vals.length}): ${vals.slice(0, 20).join(' | ')}`);
          }
        }
      }
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    }
  }
}

main().catch(console.error);
