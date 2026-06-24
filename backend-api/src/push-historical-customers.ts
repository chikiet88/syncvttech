import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  const credsPath = '/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json';
  if (!fs.existsSync(credsPath)) {
    console.error('Credentials file not found:', credsPath);
    return;
  }
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  const clientEmail = creds.client_email;
  const privateKey = creds.private_key;

  // Authenticate with Google
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

  console.log('🔑 Authenticating with Google OAuth...');
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const token = response.data.access_token;
  const spreadsheetId = '1xVkxWUPUSsfZ64Jhov5k3EOTrXT-QT3_PpNNSFFqFvI';
  const rangeName = 'DSKH 2019-2022';
  const sheetId = 0; // The sheetId for "DSKH 2019-2022" is 0

  // 1. Clear sheet
  console.log(`🧹 Clearing sheet: "${rangeName}"...`);
  await axios.post(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeName)}!A:Z:clear`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 2. Setup dates & Count customers from DB
  const fromDate = new Date('2018-01-01T00:00:00Z');
  const toDate = new Date('2022-12-31T23:59:59.999Z');

  console.log(`📊 Counting customers from DB: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
  const totalCount = await prisma.customer.count({
    where: {
      crm_created_at: {
        gte: fromDate,
        lte: toDate,
      },
    },
  });
  console.log(`👥 Found ${totalCount} customers to push.`);

  // 3. Resize sheet grid to fit all customers + header row
  const requiredRows = totalCount + 10; // Extra padding
  console.log(`📐 Resizing sheet grid to rowCount: ${requiredRows}...`);
  await axios.post(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                rowCount: requiredRows,
              },
            },
            fields: 'gridProperties.rowCount',
          },
        },
      ],
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  console.log('✅ Grid resized successfully.');

  // 4. Write header row
  const headers = [
    'STT',
    'ID VTTech',
    'Mã Khách Hàng',
    'Họ và Tên',
    'Số Điện Thoại',
    'Giới Tính',
    'Ngày Sinh',
    'Địa Chỉ',
    'Chi Nhánh',
    'Nguồn Khách Hàng',
    'Tổng Chi Tiêu',
    'Tổng Công Nợ',
    'Điểm Tích Lũy',
    'Ngày Tạo CRM'
  ];

  await axios.put(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeName)}!A1?valueInputOption=USER_ENTERED`,
    { values: [headers] },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  console.log('✅ Headers written successfully.');

  const batchSize = 5000;
  let offset = 0;
  let index = 1;

  const formatExcelDateString = (date: Date | null): string => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatGender = (gender: number | null): string => {
    if (gender === 61) return 'Nữ';
    if (gender === 60) return 'Nam';
    return gender ? String(gender) : '';
  };

  while (offset < totalCount) {
    console.log(`⚡ Fetching batch: offset ${offset}, limit ${batchSize}...`);
    const customers = await prisma.customer.findMany({
      where: {
        crm_created_at: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        branch: true,
        source: true,
      },
      orderBy: {
        crm_created_at: 'asc',
      },
      skip: offset,
      take: batchSize,
    });

    if (customers.length === 0) {
      console.log('No more customers fetched.');
      break;
    }

    const values = customers.map(c => [
      index++,
      c.id,
      c.code || '',
      c.name,
      c.phone || '',
      formatGender(c.gender),
      formatExcelDateString(c.birthday),
      c.address || '',
      c.branch?.name || '',
      c.source?.name || '',
      c.total_spent,
      c.total_debt,
      c.point,
      formatExcelDateString(c.crm_created_at)
    ]);

    // Append to sheet
    const startRow = offset + 2; // Row 1 is header
    const range = `${rangeName}!A${startRow}`;
    
    console.log(`📤 Writing batch of ${customers.length} rows to range ${range}...`);
    await axios.put(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { values },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    offset += customers.length;
    console.log(`✨ Progress: ${offset}/${totalCount} (${Math.round((offset / totalCount) * 100)}%)`);
    
    // Tiny cooling timeout to prevent hitting API rate limits
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  console.log('🎉 SUCCESSFULLY PUSHED ALL HISTORICAL CUSTOMERS TO GOOGLE SHEETS!');
}

main()
  .catch(err => {
    console.error('❌ Error executing script:', err.message);
    if (err.response) {
      console.error('Response Data:', err.response.data);
    }
  })
  .finally(() => prisma.$disconnect());
