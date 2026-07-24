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

  const [resTaza, resTaza2406] = await Promise.all([
    axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Taza!A:Z`, { headers }),
    axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Taza_2406!A:Z`, { headers })
  ]);

  const rowsTaza: any[][] = resTaza.data.values || [];
  const rowsTaza2406: any[][] = resTaza2406.data.values || [];

  console.log(`=== STATS ===`);
  console.log(`Taza length: ${rowsTaza.length}`);
  console.log(`Taza_2406 length: ${rowsTaza2406.length}`);

  let mismatches = 0;
  const minLength = Math.min(rowsTaza.length, rowsTaza2406.length);
  for (let i = 0; i < minLength; i++) {
    const r1 = rowsTaza[i];
    const r2 = rowsTaza2406[i];
    if ((r1[0] || '') !== (r2[0] || '')) {
      mismatches++;
      if (mismatches <= 10) {
        console.log(`  Row ${i + 1} code mismatch: Taza = "${r1[0]}", Taza_2406 = "${r2[0]}"`);
      }
    }
  }
  console.log(`Overlapping rows check: Total index mismatches of code in col A: ${mismatches}`);
}

main().catch(console.error);
