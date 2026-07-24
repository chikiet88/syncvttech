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

  const spreadsheetId = '1Z6HrWtnH769ePrlgefuz-ls_ym0TXTOndEjx1MdF-Zo';

  // 1. Inspect existing sheets in the spreadsheet
  const metaRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const existingSheets = metaRes.data.sheets || [];
  console.log('Existing sheets:', existingSheets.map((s: any) => s.properties.title));

  let timonaSheet = existingSheets.find((s: any) => s.properties.title === 'Timona');
  if (!timonaSheet) {
    console.log('Creating tab "Timona"...');
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Timona',
                gridProperties: { rowCount: 6000, columnCount: 10 }
              }
            }
          }
        ]
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('Tab "Timona" created successfully!');
  }

  // 2. Query all Timona 2026 appointments
  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const endDate = new Date('2026-12-31T23:59:59.999Z');

  const timonaAppts = await prisma.appointment.findMany({
    where: {
      appointment_date: { gte: startDate, lte: endDate },
      branch: { name: { contains: 'Timona', mode: 'insensitive' } }
    },
    include: { customer: { include: { source: true } }, branch: true },
    orderBy: { appointment_date: 'asc' }
  });

  console.log(`Found ${timonaAppts.length} Timona appointments for 2026.`);

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

  const rows = timonaAppts.map(a => {
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

  const values = [headers, ...rows];

  // 3. Clear & write to Timona tab (using range Timona!A1)
  console.log(`Clearing range Timona!A:Z...`);
  await axios.post(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Timona!A:Z:clear`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < values.length; i += CHUNK_SIZE) {
    const chunk = values.slice(i, i + CHUNK_SIZE);
    const startRow = i + 1;
    const range = `Timona!A${startRow}`;
    console.log(`Writing chunk ${i / CHUNK_SIZE + 1} (${chunk.length} rows) to ${range}...`);
    await axios.put(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      { values: chunk },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  }

  console.log('🎉 Timona data push completed successfully!');
  await prisma.$disconnect();
}

main().catch(console.error);
