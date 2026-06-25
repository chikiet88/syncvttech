/**
 * Script: Xóa 2 sheet cũ (Taza, Timona) và đưa sheet 2026 lên đầu
 */
import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const SPREADSHEET_ID = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';

async function getAccessToken(): Promise<string> {
  const paths = [
    './google-service-account.json',
    '../google-service-account.json',
    '/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json',
  ];
  let creds: any = null;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      creds = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    }
  }
  if (!creds) throw new Error('No credentials found');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(creds.private_key, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;

  const res = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });
  return res.data.access_token;
}

async function main() {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Lấy metadata spreadsheet
  const meta = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
    { headers }
  );

  const sheets = meta.data.sheets as any[];
  console.log('=== Danh sách sheet hiện tại ===');
  sheets.forEach((s: any, i: number) => {
    console.log(`  ${i}: [ID=${s.properties.sheetId}] ${s.properties.title} (${s.properties.gridProperties?.rowCount} rows × ${s.properties.gridProperties?.columnCount} cols)`);
  });

  const batchRequests: any[] = [];

  // 2. Xóa 2 sheet cũ "Taza" và "Timona" (không phải Taza_YYYY)
  const sheetsToDelete = sheets.filter((s: any) => 
    s.properties.title === 'Taza' || s.properties.title === 'Timona'
  );

  for (const s of sheetsToDelete) {
    console.log(`\n🗑️ Xóa sheet: "${s.properties.title}" (ID=${s.properties.sheetId})`);
    batchRequests.push({
      deleteSheet: { sheetId: s.properties.sheetId }
    });
  }

  // 3. Sắp xếp lại thứ tự: 2026 trước, rồi 2025, 2024, ...
  const desiredOrder = [
    'Taza_2026', 'Timona_2026',
    'Taza_2025', 'Timona_2025',
    'Taza_2024', 'Timona_2024',
    'Taza_2023', 'Timona_2023',
    'Taza_2022', 'Timona_2022',
    'Taza_2021', 'Timona_2021',
    'Taza_2020', 'Timona_2020',
  ];

  let index = 0;
  for (const name of desiredOrder) {
    const sheet = sheets.find((s: any) => s.properties.title === name);
    if (sheet) {
      batchRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheet.properties.sheetId,
            index: index,
          },
          fields: 'index',
        },
      });
      index++;
    }
  }

  console.log(`\n📋 Thực hiện ${batchRequests.length} thao tác (xóa ${sheetsToDelete.length} sheet + sắp xếp ${index} sheet)...`);

  // 4. Thực thi batch update
  const result = await axios.post(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    { requests: batchRequests },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );

  console.log(`\n✅ Hoàn tất! ${result.data.replies?.length} thao tác đã thực hiện.`);

  // 5. Kiểm tra kết quả
  const metaAfter = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
    { headers }
  );
  console.log('\n=== Thứ tự sheet sau khi sắp xếp ===');
  (metaAfter.data.sheets as any[]).forEach((s: any, i: number) => {
    console.log(`  ${i}: ${s.properties.title}`);
  });
}

main().catch(console.error);
