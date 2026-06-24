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

  // Authenticate with Google Sheets API
  const header = { alg: 'RS256', typ: 'JWT' };
  const nowTime = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: nowTime + 3600,
    iat: nowTime,
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
  const oauthResponse = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const token = oauthResponse.data.access_token;
  const spreadsheetId = '1xVkxWUPUSsfZ64Jhov5k3EOTrXT-QT3_PpNNSFFqFvI';
  const targetSheetTitle = 'Báo cáo đồng bộ DSKH';

  // 1. Get current sheets in the spreadsheet
  console.log('Fetching spreadsheet sheets metadata...');
  const spreadsheetInfo = await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const sheets = spreadsheetInfo.data.sheets || [];
  const targetSheetExists = sheets.some((s: any) => s.properties.title === targetSheetTitle);

  // 2. Create the sheet if it doesn't exist
  if (!targetSheetExists) {
    console.log(`Creating new sheet: "${targetSheetTitle}"...`);
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        requests: [
          {
            addSheet: {
              properties: {
                title: targetSheetTitle,
                gridProperties: {
                  rowCount: 50,
                  columnCount: 10,
                },
              },
            },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('Sheet created successfully.');
  } else {
    console.log(`Sheet "${targetSheetTitle}" already exists. Overwriting it...`);
  }

  // 3. Clear sheet content
  console.log(`Clearing sheet content: "${targetSheetTitle}"...`);
  await axios.post(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheetTitle)}!A:Z:clear`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 4. Query data from PostgreSQL
  console.log('Querying statistics from DB...');
  const rawStats: any[] = await prisma.$queryRaw`
    SELECT 
      EXTRACT(YEAR FROM crm_created_at)::int as yr, 
      COUNT(DISTINCT DATE(crm_created_at))::int as unique_days, 
      COUNT(*)::int as total_customers 
    FROM customers 
    GROUP BY yr 
    ORDER BY yr ASC
  `;

  // Calculate elapsed days in 2026 up to today (local time)
  const startOf2026 = new Date('2026-01-01T00:00:00Z');
  const today = new Date();
  const elapsedMs = today.getTime() - startOf2026.getTime();
  const elapsedDays2026 = Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1);

  // Format data for writing
  const headers = [
    'Năm', 
    'Số ngày có khách hàng mới (unique_days)', 
    'Tổng số khách hàng đã đồng bộ', 
    'Tỷ lệ bao phủ số ngày trong năm'
  ];

  const rows = rawStats.map(item => {
    const yr = item.yr;
    const uniqueDays = item.unique_days;
    const totalCust = item.total_customers;

    let yrText = yr ? String(yr) : 'Khác / Trống ngày';
    let coverageText = '';

    if (yr === 2018) {
      yrText = '2018 trở về trước';
      coverageText = 'Dữ liệu lịch sử cũ được import bulk';
    } else if (yr === 2019) {
      // 2019 only started from October (92 days total in Q4)
      const percentage = ((uniqueDays / 92) * 100).toFixed(1);
      coverageText = `${percentage}% (Bắt đầu hoạt động từ tháng 10)`;
    } else if (yr === 2020) {
      const percentage = ((uniqueDays / 366) * 100).toFixed(1);
      coverageText = `${percentage}%`;
    } else if (yr === 2021) {
      const percentage = ((uniqueDays / 365) * 100).toFixed(1);
      coverageText = `${percentage}% (Thấp hơn do phong tỏa dịch COVID-19)`;
    } else if (yr === 2022 || yr === 2023 || yr === 2025) {
      const percentage = ((uniqueDays / 365) * 100).toFixed(1);
      coverageText = `${percentage}%`;
    } else if (yr === 2024) {
      const percentage = ((uniqueDays / 366) * 100).toFixed(1);
      coverageText = `${percentage}%`;
    } else if (yr === 2026) {
      const percentage = ((uniqueDays / elapsedDays2026) * 100).toFixed(1);
      coverageText = `${percentage}% (Tính đến ngày hiện tại)`;
    } else {
      coverageText = '-';
    }

    return [
      yrText,
      yr ? uniqueDays : '-',
      totalCust,
      coverageText
    ];
  });

  const allValues = [headers, ...rows];

  // 5. Write to the sheet
  console.log(`Writing values to "${targetSheetTitle}"...`);
  await axios.put(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheetTitle)}!A1?valueInputOption=USER_ENTERED`,
    { values: allValues },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  console.log('🎉 Successfully created report sheet and populated data!');
}

main()
  .catch(err => {
    console.error('❌ Error executing script:', err.message);
    if (err.response) {
      console.error('Response Data:', err.response.data);
    }
  })
  .finally(() => prisma.$disconnect());
