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

  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const endDate = new Date('2026-12-31T23:59:59.999Z');

  console.log(`🔍 Querying ALL 2026 appointments from DB...`);
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

  console.log(`📊 DB Results: Taza = ${tazaAppts.length} rows, Timona = ${timonaAppts.length} rows.`);

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
    const safeNote = rawNote.length > 3000 ? rawNote.slice(0, 3000) + '...' : rawNote;

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

  const pushToTab = async (tabName: string, appts: any[]) => {
    const values = [headers, ...formatRows(appts)];
    console.log(`\n🚀 Clearing & Writing ${values.length} rows to tab "${tabName}"...`);

    // Ensure tab exists and resize grid
    const metaRes = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const existingSheets = metaRes.data.sheets || [];
    let targetSheet = existingSheets.find((s: any) => s.properties.title === tabName);

    if (!targetSheet) {
      console.log(`Creating tab "${tabName}"...`);
      const addRes = await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        { requests: [{ addSheet: { properties: { title: tabName, gridProperties: { rowCount: values.length + 500, columnCount: 10 } } } }] },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      targetSheet = addRes.data.replies[0].addSheet.properties;
    } else {
      const currentRows = targetSheet.properties.gridProperties?.rowCount || 0;
      if (currentRows < values.length + 100) {
        console.log(`Resizing grid rows for "${tabName}" from ${currentRows} to ${values.length + 500}...`);
        await axios.post(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          { requests: [{ updateSheetProperties: { properties: { sheetId: targetSheet.properties.sheetId, gridProperties: { rowCount: values.length + 500, columnCount: 10 } }, fields: 'gridProperties.rowCount,gridProperties.columnCount' } }] },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
      }
    }

    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A:Z:clear`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < values.length; i += CHUNK_SIZE) {
      const chunk = values.slice(i, i + CHUNK_SIZE);
      const startRow = i + 1;
      const range = `${tabName}!A${startRow}`;
      console.log(`Writing chunk rows ${startRow} to ${startRow + chunk.length - 1} (${chunk.length} rows) to ${range}...`);
      await axios.put(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
        { values: chunk },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`✅ Tab "${tabName}" finished writing all ${values.length} rows!`);
  };

  await pushToTab('Taza', tazaAppts);
  await pushToTab('Timona', timonaAppts);

  console.log('\n🎉 ALL 2026 APPOINTMENTS FULLY PUSHED TO BOTH TABS!');
  await prisma.$disconnect();
}

main().catch(console.error);
