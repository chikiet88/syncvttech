/**
 * Kiểm tra tên sheet trong Google Spreadsheet
 */
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '1xVkxWUPUSsfZ64Jhov5k3EOTrXT-QT3_PpNNSFFqFvI';
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../google-service-account.json');

async function main() {
  const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  console.log('📊 Spreadsheet Title:', res.data.properties?.title);
  console.log('📋 Sheets:');
  res.data.sheets?.forEach((s, i) => {
    console.log(`  [${i}] sheetId=${s.properties?.sheetId}, title="${s.properties?.title}", rows=${s.properties?.gridProperties?.rowCount}, cols=${s.properties?.gridProperties?.columnCount}`);
  });
}

main().catch(err => {
  console.error('❌ Lỗi:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
});
