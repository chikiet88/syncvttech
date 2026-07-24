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

  console.log(`🧹 Cleaning up empty Sheet1 from spreadsheet ${spreadsheetId}...`);
  try {
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        requests: [
          {
            deleteSheet: {
              sheetId: 0
            }
          }
        ]
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('✅ Deleted empty Sheet1 successfully!');
  } catch (e: any) {
    console.error('❌ Error deleting Sheet1:', e.response?.data || e.message);
  }

  await app.close();
}

main().catch(console.error);
