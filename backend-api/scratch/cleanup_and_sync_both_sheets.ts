import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const tokenInput = `${base64UrlEncode(header)}.${base64UrlEncode(claimSet)}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(tokenInput);
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
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
  const prisma = new PrismaClient();
  const creds = JSON.parse(fs.readFileSync('/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json', 'utf8'));
  const token = await getAccessToken(creds.client_email, creds.private_key);

  const oldSheetId = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';
  const newSheetId = '1Z6HrWtnH769ePrlgefuz-ls_ym0TXTOndEjx1MdF-Zo';

  // =========================================================
  // STEP 1: Delete Taza_2026 and Timona_2026 from OLD Sheet
  // =========================================================
  console.log(`🧹 Inspecting OLD spreadsheet ${oldSheetId}...`);
  const oldMetaRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${oldSheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const oldSheets = oldMetaRes.data.sheets || [];
  const deleteRequests: any[] = [];

  for (const sheetTitle of ['Taza_2026', 'Timona_2026']) {
    const s = oldSheets.find((sheet: any) => sheet.properties.title === sheetTitle);
    if (s) {
      console.log(`Found tab "${sheetTitle}" (sheetId: ${s.properties.sheetId}) in OLD sheet. Scheduling deletion...`);
      deleteRequests.push({ deleteSheet: { sheetId: s.properties.sheetId } });
    }
  }

  if (deleteRequests.length > 0) {
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${oldSheetId}:batchUpdate`,
      { requests: deleteRequests },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('✅ Deleted 2026 tabs from OLD spreadsheet successfully!');
  } else {
    console.log('ℹ️ No 2026 tabs found in OLD spreadsheet.');
  }

  // =========================================================
  // STEP 2: Ensure Taza and Timona tabs exist in NEW 2026 Sheet
  // =========================================================
  console.log(`🚀 Syncing 2026 data (Taza & Timona) to NEW spreadsheet ${newSheetId}...`);
  const newMetaRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const newSheets = newMetaRes.data.sheets || [];

  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const endDate = new Date('2026-12-31T23:59:59.999Z');

  const [tazaAppts, timonaAppts] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        appointment_date: { gte: startDate, lte: endDate },
        branch: { name: { contains: 'Taza', mode: 'insensitive' } }
      },
      include: { customer: { include: { source: true } }, branch: true },
      orderBy: { appointment_date: 'asc' }
    }),
    prisma.appointment.findMany({
      where: {
        appointment_date: { gte: startDate, lte: endDate },
        branch: { name: { contains: 'Timona', mode: 'insensitive' } }
      },
      include: { customer: { include: { source: true } }, branch: true },
      orderBy: { appointment_date: 'asc' }
    })
  ]);

  console.log(`Found ${tazaAppts.length} Taza appointments and ${timonaAppts.length} Timona appointments for 2026.`);

  const headers = [
    'Mã lịch hẹn', 'MLH&KH', 'Ngày hẹn', 'Số điện thoại', 'Nội dung',
    'Trạng thái', 'Chi nhánh', 'Loại', 'TEN SALE&THỜI GIAN&NGÀY', 'Nguồn khách hàng'
  ];

  const formatExcelDateString = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatRows = (appts: any[]) => appts.map(a => {
    const custCode = a.customer?.code || '';
    const custName = a.customer?.name || a.customer_name || '';
    const rawNote = a.note || '';
    const safeNote = rawNote.length > 5000 ? rawNote.slice(0, 5000) + '...' : rawNote;

    return [
      a.vttech_code || '',
      `${custCode}${custName}`,
      a.appointment_date ? formatExcelDateString(a.appointment_date) : '',
      a.phone || '',
      safeNote,
      a.status_name || ((a.status === 2 || a.status === 4) ? 'Ra Về' : 'Đặt Hẹn'),
      a.branch?.name || a.branch_name || '',
      a.type_name || (a.service_name?.toLowerCase().includes('tư vấn') ? 'Tư vấn' : 'Điều trị'),
      a.appointment_date ? formatExcelDateString(a.appointment_date) : '',
      a.customer?.source?.name || 'Khách Giới Thiệu'
    ];
  });

  const tazaValues = [headers, ...formatRows(tazaAppts)];
  const timonaValues = [headers, ...formatRows(timonaAppts)];

  // Ensure Taza and Timona sheets exist in new spreadsheet
  const addSheetRequests: any[] = [];
  let tazaSheet = newSheets.find((s: any) => s.properties.title === 'Taza');
  let timonaSheet = newSheets.find((s: any) => s.properties.title === 'Timona');

  if (!tazaSheet && newSheets.length > 0 && newSheets[0].properties.title !== 'Timona') {
    addSheetRequests.push({
      updateSheetProperties: {
        properties: { sheetId: newSheets[0].properties.sheetId, title: 'Taza' },
        fields: 'title'
      }
    });
  }

  if (!timonaSheet) {
    addSheetRequests.push({
      addSheet: {
        properties: { title: 'Timona', gridProperties: { rowCount: Math.max(timonaValues.length + 500, 1000), columnCount: 10 } }
      }
    });
  }

  if (addSheetRequests.length > 0) {
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}:batchUpdate`,
      { requests: addSheetRequests },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('✅ Created/Renamed tabs in NEW spreadsheet.');
  }

  // Write in chunks of 1000
  const writeChunks = async (sheetName: string, values: any[][]) => {
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}/values/'${sheetName}'!A:Z:clear`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const CHUNK = 1000;
    for (let i = 0; i < values.length; i += CHUNK) {
      const chunk = values.slice(i, i + CHUNK);
      const range = `'${sheetName}'!A${i + 1}`;
      console.log(`Writing ${chunk.length} rows to ${sheetName} (range: ${range})...`);
      await axios.put(
        `https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        { values: chunk },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
    }
  };

  await writeChunks('Taza', tazaValues);
  await writeChunks('Timona', timonaValues);

  console.log('🎉 Complete! Taza and Timona 2026 data fully synced to NEW sheet, and 2026 tabs removed from OLD sheet.');
  await prisma.$disconnect();
}

main().catch(console.error);
