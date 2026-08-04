import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';
import axios from 'axios';
import * as fs from 'fs';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ExcelExportService);

  const creds = JSON.parse(fs.readFileSync('/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json', 'utf8'));
  const token = await (service as any).getGoogleSheetsAccessToken(creds.client_email, creds.private_key);

  const spreadsheetId = '1Z6HrWtnH769ePrlgefuz-ls_ym0TXTOndEjx1MdF-Zo';

  console.log(`🔍 Inspecting actual rows in spreadsheet ${spreadsheetId}...`);
  const metaRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const sheets = metaRes.data.sheets || [];
  for (const s of sheets) {
    const props = s.properties;
    console.log(`\n📌 Tab "${props.title}" (grid rowCount setting: ${props.gridProperties?.rowCount})`);

    const valRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${props.title}'!A:A`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const rows = valRes.data.values || [];
    console.log(`  Actual non-empty row count in A column: ${rows.length}`);
    console.log(`  First row (Header):`, rows[0]);
    console.log(`  Row 5000:`, rows[4999] || '(none)');
    console.log(`  Row 5001:`, rows[5000] || '(none)');
    console.log(`  Row 10000:`, rows[9999] || '(none)');
    console.log(`  Last row (${rows.length}):`, rows[rows.length - 1] || '(none)');
  }

  await app.close();
}

main().catch(console.error);
