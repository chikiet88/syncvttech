import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const NEW_SHEET_ID = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';
const TARGET_CODES = ["TPTZ20260627.782398", "TPTZ20260612.775753", "TPTZ20260609.774605", "NHH20260607.773241", "TPTZ20260516.763290"];

async function getGoogleSheetsAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const tokenInput = `${base64UrlEncode(header)}.${base64UrlEncode(claim)}`;
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(tokenInput);
  const signature = signer.sign(formattedPrivateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${tokenInput}.${signature}`;

  const response = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  return response.data.access_token;
}

async function main() {
  let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  let creds: any = null;

  const paths = [
    './google-service-account.json',
    '../google-service-account.json',
    '/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json'
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        creds = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      } catch {}
    }
  }

  if (creds) {
    clientEmail = creds.client_email;
    privateKey = creds.private_key;
  }

  const token = await getGoogleSheetsAccessToken(clientEmail, privateKey);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${NEW_SHEET_ID}/values/Taza_2026!A:Z`;
  
  console.log("Fetching Taza_2026 sheet...");
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  const rows = res.data.values || [];

  console.log(`Total rows in Taza_2026: ${rows.length}`);
  
  for (const target of TARGET_CODES) {
    const foundIdx = rows.findIndex(r => r[0] === target);
    if (foundIdx !== -1) {
      console.log(`Found ${target} at row ${foundIdx + 1}: ${JSON.stringify(rows[foundIdx])}`);
    } else {
      console.log(`Not found ${target} in Taza_2026 sheet.`);
    }
  }
}

main().catch(console.error);
