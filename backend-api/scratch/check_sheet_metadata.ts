import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '1GW8hVnHnT0LzLOxbFzt9PWdJwzKWMYX1_H6UnJdapUw';
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../google-service-account.json');

async function main() {
  console.log('🔐 Authentication check...');
  const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('📊 Fetching spreadsheet metadata...');
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  console.log('Spreadsheet Title:', metadata.data.properties?.title);
  console.log('Sheets:');
  const sheetList = metadata.data.sheets || [];
  for (const s of sheetList) {
    console.log(`  - Title: "${s.properties?.title}" | ID: ${s.properties?.sheetId} | GridProperties:`, s.properties?.gridProperties);
  }

  // Let's read the first 10 rows of the first sheet to see the structure
  const firstSheetName = sheetList[0]?.properties?.title || 'Sheet1';
  console.log(`\n📖 Reading first 10 rows from sheet "${firstSheetName}"...`);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${firstSheetName}'!A1:D10`,
  });

  console.log('Values:');
  console.log(response.data.values);
}

main().catch((err) => {
  console.error('❌ Error:', err.message || err);
  if (err.response?.data) {
    console.error('   Details:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
