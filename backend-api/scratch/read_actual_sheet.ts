import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

async function getGoogleSheetsAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

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
  console.log("=== READING ACTUAL GOOGLE SHEET ===");

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
        console.log(`Loaded credentials from: ${p}`);
        break;
      } catch (e: any) {
        console.error(`Failed to read path ${p}: ${e.message}`);
      }
    }
  }

  if (creds) {
    clientEmail = creds.client_email;
    privateKey = creds.private_key;
  }

  if (!clientEmail || !privateKey) {
    throw new Error("No google service credentials found.");
  }

  const token = await getGoogleSheetsAccessToken(clientEmail, privateKey);
  const spreadsheetId = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';

  console.log("Fetching values from sheet 'Taza'...");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!A:Z`;
  
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log("No data found in Taza sheet.");
    return;
  }

  console.log(`Total rows currently in Taza sheet: ${rows.length}`);

  const targetCode = 'C_T20260618.778444';
  const targetCodeShort = 'C_T20260618.77844';
  
  let foundIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Column A is 'Mã lịch hẹn' (index 0)
    if (row[0] === targetCode || row[0] === targetCodeShort) {
      foundIndex = i;
      console.log(`\nFound target at actual sheet row ${i + 1}:`);
      console.log(JSON.stringify(row));
    }
  }

  if (foundIndex !== -1) {
    console.log("\nActual rows around target in sheet:");
    const startIdx = Math.max(0, foundIndex - 5);
    const endIdx = Math.min(rows.length - 1, foundIndex + 5);
    for (let i = startIdx; i <= endIdx; i++) {
      console.log(`Row ${i + 1}: ${JSON.stringify(rows[i])}`);
    }
  } else {
    console.log(`\nTarget ${targetCode} not found in actual sheet!`);
  }
}

main().catch(console.error);
