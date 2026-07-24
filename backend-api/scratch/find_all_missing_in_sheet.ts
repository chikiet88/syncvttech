import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_SHEET_ID = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';
const TARGET_DATE_ISO_START = new Date('2026-06-27T17:00:00.000Z');
const TARGET_DATE_ISO_END = new Date('2026-06-28T17:00:00.000Z');

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

  const sheetCodes = rows.slice(1).map(r => r[0]).filter(Boolean);
  const sheetSet = new Set(sheetCodes);

  // Fetch DB codes
  const dbAppts = await prisma.appointment.findMany({
    where: {
      appointment_date: {
        gte: TARGET_DATE_ISO_START,
        lte: TARGET_DATE_ISO_END,
      },
      branch: {
        name: { contains: 'Taza', mode: 'insensitive' }
      }
    }
  });
  
  const dbCodes = dbAppts.map(a => a.vttech_code).filter(Boolean);
  const missing = dbCodes.filter(c => !sheetSet.has(c));

  console.log(`\nFound ${missing.length} missing codes from sheet completely:`);
  console.log(JSON.stringify(missing));

  console.log("\nSearching for all DB June 28 codes in the sheet to see if they exist under a DIFFERENT date:");
  const presentWithDifferentDate: any[] = [];
  const completelyMissing: string[] = [];

  for (const code of dbCodes) {
    const idx = rows.findIndex(r => r[0] === code);
    if (idx !== -1) {
      const sheetRow = rows[idx];
      const dbRow = dbAppts.find(a => a.vttech_code === code);
      const sheetDate = sheetRow[2];
      const dbDate = dbRow?.appointment_date ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(dbRow.appointment_date).replace(/\//g, '-') : '';

      if (sheetDate !== dbDate) {
        presentWithDifferentDate.push({
          code,
          sheetRow: idx + 1,
          sheetDate,
          dbDate,
          customer: sheetRow[1],
        });
      }
    } else {
      completelyMissing.push(code);
    }
  }

  console.log(`\n- Total June 28 appointments in DB: ${dbCodes.length}`);
  console.log(`- Total June 28 appointments in Sheet: ${rows.slice(1).filter(r => r[2] === '28-06-2026').length}`);
  console.log(`- Present in sheet with DIFFERENT date (rescheduled): ${presentWithDifferentDate.length}`);
  console.log(JSON.stringify(presentWithDifferentDate, null, 2));
  console.log(`- Completely missing from sheet: ${completelyMissing.length}`);
  console.log(JSON.stringify(completelyMissing));

  await prisma.$disconnect();
}

main().catch(console.error);
