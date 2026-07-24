import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const SPREADSHEET_ID = '1O3uYIsgXE25HHRe3a89lrXDx-47STR00N0jgy4iHxWQ';

async function getAccessToken(): Promise<string> {
  const creds = JSON.parse(fs.readFileSync('google-service-account.json', 'utf8'));
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

  const metaRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, { headers });
  console.log('Title:', metaRes.data.properties.title);
  const sheets = metaRes.data.sheets || [];
  console.log('Sheets count:', sheets.length);

  for (const s of sheets) {
    const title = s.properties.title;
    const vRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${title}'!A1:Z5`, { headers });
    const rows = vRes.data.values || [];
    console.log(`\n--- Sheet: "${title}" (ID: ${s.properties.sheetId}) ---`);
    console.log('Header:', rows[0]);
    console.log('Sample Row 1:', rows[1]);
  }
}

main().catch(console.error);
