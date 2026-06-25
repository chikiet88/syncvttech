import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(tokenInput);
  const signature = signer.sign(privateKey.replace(/\\n/g, '\n'), 'base64')
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
  console.log("=== COMPARING ACTUAL GOOGLE SHEET VS DB SIMULATION ===");

  // 1. Fetch credentials
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

  if (!clientEmail || !privateKey) {
    throw new Error("No google service credentials found.");
  }

  // 2. Fetch sheet values
  const token = await getGoogleSheetsAccessToken(clientEmail, privateKey);
  const spreadsheetId = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Taza!A:Z`;
  
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  const sheetRows = res.data.values || [];
  
  // Sheet records (skip header)
  const sheetCodes = sheetRows.slice(1).map((r: any) => r[0]).filter(Boolean) as string[];
  console.log(`Sheet total data rows: ${sheetCodes.length}`);

  // 3. Fetch DB records
  const dateFrom = new Date('2026-01-01T00:00:00.000Z');
  const dateTo = new Date('2026-06-24T23:59:59.999Z');

  const whereAndConditions: any[] = [
    { appointment_date: { gte: dateFrom, lte: dateTo } },
    { branch: { name: { contains: 'Taza', mode: 'insensitive' } } },
    {
      OR: [
        { status_name: { contains: 'Ra Về', mode: 'insensitive' } },
        {
          AND: [
            { OR: [{ status_name: null }, { status_name: '' }] },
            { OR: [{ status: 2 }, { status: 4 }] }
          ]
        }
      ]
    },
    {
      OR: [
        { type_name: { contains: 'tư vấn', mode: 'insensitive' } },
        {
          AND: [
            { OR: [{ type_name: null }, { type_name: '' }] },
            { service_name: { contains: 'tư vấn', mode: 'insensitive' } }
          ]
        }
      ]
    }
  ];

  const dbAppts = await prisma.appointment.findMany({
    where: { AND: whereAndConditions },
    orderBy: [
      { appointment_date: 'asc' },
      { id: 'asc' }
    ]
  });

  const dbCodes = dbAppts.map(a => a.vttech_code).filter(Boolean) as string[];
  console.log(`DB simulation total rows: ${dbCodes.length}`);

  // 4. Set comparisons
  const sheetSet = new Set(sheetCodes);
  const dbSet = new Set(dbCodes);

  const inDbNotSheet = dbCodes.filter(c => !sheetSet.has(c));
  const inSheetNotDb = sheetCodes.filter(c => !dbSet.has(c));

  console.log(`\nRecords in DB but NOT in Google Sheet (Count: ${inDbNotSheet.length}):`);
  if (inDbNotSheet.length > 0) {
    console.log(JSON.stringify(inDbNotSheet.slice(0, 10)) + (inDbNotSheet.length > 10 ? ' ... and more' : ''));
  }

  console.log(`\nRecords in Google Sheet but NOT in DB (Count: ${inSheetNotDb.length}):`);
  if (inSheetNotDb.length > 0) {
    console.log(JSON.stringify(inSheetNotDb.slice(0, 10)) + (inSheetNotDb.length > 10 ? ' ... and more' : ''));
  }

  // 5. Check index of target
  const targetCode = 'C_T20260618.778444';
  const idxInSheet = sheetCodes.indexOf(targetCode);
  const idxInDb = dbCodes.indexOf(targetCode);
  
  console.log(`\nTarget '${targetCode}':`);
  console.log(`- Index on Google Sheet: ${idxInSheet !== -1 ? idxInSheet + 2 : 'Not found'} (Row ${idxInSheet !== -1 ? idxInSheet + 2 : ''})`);
  console.log(`- Index in DB Simulation: ${idxInDb !== -1 ? idxInDb + 2 : 'Not found'} (Row ${idxInDb !== -1 ? idxInDb + 2 : ''})`);

  // 6. Check if target date segment has mismatch or different sorting
  // Let's find the appointment date of target
  const targetAppt = dbAppts.find(a => a.vttech_code === targetCode);
  if (targetAppt) {
    const targetDateStr = '23-06-2026'; // We know it's 23-06-2026
    console.log(`\nAnalyzing appointments for date: ${targetDateStr}`);
    
    // In Sheet, filter rows with date '23-06-2026' (Col 3 is Index 2 in sheet values, which is rows[i][2])
    // Note: sheetRows includes header, so sheetRows[1] is index 0 in sheetCodes, rows[i][2] matches date
    const sheetApptsOnDate = sheetRows.slice(1).filter((r: any) => r[2] === targetDateStr);
    const dbApptsOnDate = dbAppts.filter(a => {
      const d = a.appointment_date;
      if (!d) return false;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}` === targetDateStr;
    });

    console.log(`- Count on Sheet for ${targetDateStr}: ${sheetApptsOnDate.length}`);
    console.log(`- Count in DB for ${targetDateStr}: ${dbApptsOnDate.length}`);

    // Let's print the codes of both to see the order
    const sheetCodesOnDate = sheetApptsOnDate.map((r: any) => r[0]);
    const dbCodesOnDate = dbApptsOnDate.map(a => a.vttech_code);

    console.log(`\nFirst 5 on Sheet: ${JSON.stringify(sheetCodesOnDate.slice(0, 5))}`);
    console.log(`First 5 in DB:    ${JSON.stringify(dbCodesOnDate.slice(0, 5))}`);

    // Let's check target position in this specific date's subset
    const targetIdxInSheetDate = sheetCodesOnDate.indexOf(targetCode);
    const targetIdxInDbDate = dbCodesOnDate.indexOf(targetCode);
    console.log(`- Target position in sheet subset: ${targetIdxInSheetDate}`);
    console.log(`- Target position in DB subset: ${targetIdxInDbDate}`);

    // Let's check if the set of codes on this date is identical
    const sheetDateSet = new Set(sheetCodesOnDate);
    const dbDateSet = new Set(dbCodesOnDate);

    const inDbNotSheetDate = dbCodesOnDate.filter(c => !sheetDateSet.has(c));
    const inSheetNotDbDate = sheetCodesOnDate.filter(c => !dbDateSet.has(c));

    console.log(`- Codes in DB but not Sheet on ${targetDateStr}: ${JSON.stringify(inDbNotSheetDate)}`);
    console.log(`- Codes in Sheet but not DB on ${targetDateStr}: ${JSON.stringify(inSheetNotDbDate)}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
