import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OLD_SHEET_ID = '1G_R_JeKOQhvKj_F_fXmfSfsgIupYyJmgvq22s2Jk7GU';
const NEW_SHEET_ID = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';
const TARGET_DATE = '28-06-2026';
const TARGET_DATE_ISO_START = new Date('2026-06-27T17:00:00.000Z'); // 2026-06-28 00:00:00 ICT
const TARGET_DATE_ISO_END = new Date('2026-06-28T17:00:00.000Z'); // 2026-06-28 24:00:00 ICT

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

async function fetchSheetData(token: string, spreadsheetId: string, range: string): Promise<any[][]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.data.values || [];
  } catch (err: any) {
    console.error(`Error fetching range ${range} from spreadsheet ${spreadsheetId}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log(`=== CHECKING SHEET VS DB DATA FOR DATE: ${TARGET_DATE} ===\n`);

  // 1. Get credentials
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
        console.log(`Loaded Google credentials from: ${p}`);
        break;
      } catch {}
    }
  }

  if (creds) {
    clientEmail = creds.client_email;
    privateKey = creds.private_key;
  }

  if (!clientEmail || !privateKey) {
    throw new Error("No Google credentials found.");
  }

  const token = await getGoogleSheetsAccessToken(clientEmail, privateKey);

  // 2. Fetch from DB
  console.log("\n--- Querying DB for 28/06/2026... ---");
  // We fetch appointments for Taza (all and filtered) and Timona (all and filtered)
  const appointments = await prisma.appointment.findMany({
    where: {
      appointment_date: {
        gte: TARGET_DATE_ISO_START,
        lte: TARGET_DATE_ISO_END,
      },
    },
    include: {
      branch: true,
    },
  });

  console.log(`Found ${appointments.length} total appointments on this date in DB.`);

  // Categorize DB appointments
  const dbTazaAll = appointments.filter(a => a.branch?.name.toLowerCase().includes('taza'));
  const dbTimonaAll = appointments.filter(a => a.branch?.name.toLowerCase().includes('timona'));

  const filterCriteria = (a: any) => {
    // Status "Ra Về" filter
    const statusOk = (a.status_name && a.status_name.toLowerCase().includes('ra về')) ||
      ((!a.status_name || a.status_name === '') && (a.status === 2 || a.status === 4));

    // Type "Tư vấn" filter
    const typeOk = (a.type_name && a.type_name.toLowerCase().includes('tư vấn')) ||
      ((!a.type_name || a.type_name === '') && (a.service_name && a.service_name.toLowerCase().includes('tư vấn')));

    return statusOk && typeOk;
  };

  const dbTazaFiltered = dbTazaAll.filter(filterCriteria);
  const dbTimonaFiltered = dbTimonaAll.filter(filterCriteria);

  console.log(`DB Stats:`);
  console.log(`- Taza All: ${dbTazaAll.length}`);
  console.log(`- Taza Filtered: ${dbTazaFiltered.length}`);
  console.log(`- Timona All: ${dbTimonaAll.length}`);
  console.log(`- Timona Filtered: ${dbTimonaFiltered.length}`);

  // 3. Fetch from Google Sheets
  console.log("\n--- Fetching Google Sheets Data... ---");

  // Old Sheet (Filtered only)
  const oldTazaRows = await fetchSheetData(token, OLD_SHEET_ID, 'Taza!A:C');
  const oldTimonaRows = await fetchSheetData(token, OLD_SHEET_ID, 'Timona!A:C');

  // New Sheet (All)
  const newTazaRows = await fetchSheetData(token, NEW_SHEET_ID, 'Taza_2026!A:C');
  const newTimonaRows = await fetchSheetData(token, NEW_SHEET_ID, 'Timona_2026!A:C');

  // Helper to extract vttech_codes for TARGET_DATE
  const getCodesOnDate = (rows: any[][], dateStr: string): string[] => {
    // Column index 0: vttech_code, Index 2: Date (DD-MM-YYYY)
    return rows
      .slice(1) // Skip header
      .filter(r => r[2] === dateStr)
      .map(r => r[0])
      .filter(Boolean);
  };

  const oldTazaCodes = getCodesOnDate(oldTazaRows, TARGET_DATE);
  const oldTimonaCodes = getCodesOnDate(oldTimonaRows, TARGET_DATE);
  const newTazaCodes = getCodesOnDate(newTazaRows, TARGET_DATE);
  const newTimonaCodes = getCodesOnDate(newTimonaRows, TARGET_DATE);

  console.log(`\nGoogle Sheet Stats for ${TARGET_DATE}:`);
  console.log(`- Old Sheet Taza (Filtered): ${oldTazaCodes.length} rows`);
  console.log(`- Old Sheet Timona (Filtered): ${oldTimonaCodes.length} rows`);
  console.log(`- New Sheet Taza_2026 (All): ${newTazaCodes.length} rows`);
  console.log(`- New Sheet Timona_2026 (All): ${newTimonaCodes.length} rows`);

  // 4. Detailed comparison
  const compareSets = (name: string, dbList: any[], sheetCodesList: string[]) => {
    const dbCodes = dbList.map(a => a.vttech_code).filter(Boolean);
    const dbSet = new Set(dbCodes);
    const sheetSet = new Set(sheetCodesList);

    const missingInSheet = dbCodes.filter(c => !sheetSet.has(c));
    const extraInSheet = sheetCodesList.filter(c => !dbSet.has(c));

    console.log(`\n>>> COMPARISON: ${name}`);
    console.log(`  - DB Count: ${dbList.length}`);
    console.log(`  - Sheet Count: ${sheetCodesList.length}`);
    console.log(`  - Missing in Sheet: ${missingInSheet.length}`);
    if (missingInSheet.length > 0) {
      console.log(`    First 5 missing codes: ${JSON.stringify(missingInSheet.slice(0, 5))}`);
    }
    console.log(`  - Extra in Sheet (not in DB): ${extraInSheet.length}`);
    if (extraInSheet.length > 0) {
      console.log(`    First 5 extra codes: ${JSON.stringify(extraInSheet.slice(0, 5))}`);
    }
  };

  compareSets("Old Sheet - Taza (Filtered)", dbTazaFiltered, oldTazaCodes);
  compareSets("Old Sheet - Timona (Filtered)", dbTimonaFiltered, oldTimonaCodes);
  compareSets("New Sheet - Taza_2026 (All)", dbTazaAll, newTazaCodes);
  compareSets("New Sheet - Timona_2026 (All)", dbTimonaAll, newTimonaCodes);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
