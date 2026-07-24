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

  const [resTimona, resTimona2406] = await Promise.all([
    axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Timona!A:Z`, { headers }),
    axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Timona_2406!A:Z`, { headers })
  ]);

  const rowsTimona: any[][] = resTimona.data.values || [];
  const rowsTimona2406: any[][] = resTimona2406.data.values || [];

  const minLength = Math.min(rowsTimona.length, rowsTimona2406.length);
  let cellMismatches = 0;

  for (let i = 0; i < minLength; i++) {
    const r1 = rowsTimona[i];
    const r2 = rowsTimona2406[i];
    for (let col = 0; col < 10; col++) {
      const c1 = r1[col] || '';
      const c2 = r2[col] || '';
      if (c1 !== c2) {
        cellMismatches++;
        console.log(`Mismatch at Row ${i + 1}, Col ${col} ("${rowsTimona[0][col]}"):`);
        console.log(`  Timona: "${c1}"`);
        console.log(`  Timona_2406: "${c2}"`);
      }
    }
  }

  console.log(`Total cell mismatches in Timona overlapping region: ${cellMismatches}`);
}

main().catch(console.error);
