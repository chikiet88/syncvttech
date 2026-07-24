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

  console.log(`🔍 Inspecting metadata for spreadsheet ${spreadsheetId}...`);
  const metaRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const sheets = metaRes.data.sheets || [];
  console.log(`Found ${sheets.length} sheets in spreadsheet:`);
  for (const s of sheets) {
    const props = s.properties;
    console.log(`- Title: "${props.title}" (sheetId: ${props.sheetId}, index: ${props.index})`);

    try {
      const valRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${props.title}'!A1:Z5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rows = valRes.data.values || [];
      console.log(`  Header row:`, rows[0] || '(empty)');
      console.log(`  Row 2 sample:`, rows[1] || '(empty)');
    } catch (e: any) {
      console.log(`  Failed to read values: ${e.message}`);
    }
  }

  await app.close();
}

main().catch(console.error);
