import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const SPREADSHEET_ID = '1G_R_JeKOQhvKj_F_fXmfSfsgIupYyJmgvq22s2Jk7GU';

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

  const meta = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
    { headers }
  );

  const sheets = meta.data.sheets as any[];
  console.log('=== Danh sách sheet ===');
  sheets.forEach((s: any, i: number) => {
    console.log(`  ${i}: "${s.properties.title}" (${s.properties.gridProperties?.rowCount} rows × ${s.properties.gridProperties?.columnCount} cols)`);
  });

  const checkSheets = ['Taza', 'Taza_2406'];
  for (const sheetName of checkSheets) {
    try {
      const res = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${sheetName}'!A1:L10`,
        { headers }
      );
      const rows = res.data.values || [];
      console.log(`\n=== Sheet: ${sheetName} (First 10 rows) ===`);
      rows.forEach((r: any, i: number) => {
        console.log(`  Row ${i + 1}: ${JSON.stringify(r)}`);
      });

      const countRes = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${sheetName}'!A:A`,
        { headers }
      );
      const totalRows = (countRes.data.values || []).length;
      console.log(`  → Total rows with data in col A: ${totalRows}`);
    } catch (err: any) {
      console.log(`  ❌ Sheet "${sheetName}" error: ${err.message}`);
    }
  }
}

main().catch(console.error);
