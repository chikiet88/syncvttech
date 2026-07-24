import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

dotenv.config();

const SPREADSHEET_ID = '1O3uYIsgXE25HHRe3a89lrXDx-47STR00N0jgy4iHxWQ';

const itemsToAdd = [
  { parentId: 62, parentName: 'FB SOL CN', name: 'KHOÁ MẸ & BÉ SOL CN' },
  { parentId: 151, parentName: 'FB SOL VP', name: 'KHOÁ MẸ & BÉ FB' },
  { parentId: 172, parentName: 'Hotline FB', name: 'KHOÁ MẸ & BÉ HFB' },
  { parentId: 210, parentName: 'Google', name: 'KHOÁ MẸ & BÉ GG' },
  { parentId: 211, parentName: 'Tiktok', name: 'KHOÁ MẸ & BÉ TT' },
  { parentId: 222, parentName: 'Hotline Web', name: 'KHOÁ MẸ & BÉ HW' },
  { parentId: 223, parentName: 'SOL BGT', name: 'KHOÁ MẸ & BÉ SBGT' },
  { parentId: 225, parentName: 'HOTLINE VÃNG LAI', name: 'KHOÁ MẸ & BÉ VL' },
  { parentId: 226, parentName: 'DATA LẠNH', name: 'KHOÁ MẸ & BÉ DL' },
  { parentId: 228, parentName: 'TELE TIMONA VP', name: 'KHOÁ MẸ & BÉ MKTVP' },
  { parentId: 229, parentName: 'TELE TAZA OUT', name: 'KHOÁ MẸ & BÉ TELE TZ OUT' },
  { parentId: 232, parentName: 'TUYỂN SINH OFF', name: 'KHOÁ MẸ & BÉ OFF' },
  { parentId: 235, parentName: 'TELE SOL TA VP', name: 'KHOÁ MẸ & BÉ TSVP' },
  { parentId: 239, parentName: 'TELE TAZA VP', name: 'KHOÁ MẸ & BÉ TELE TAZA VP' },
  { parentId: 240, parentName: 'FB SOL BGT', name: 'KHOÁ MẸ & BÉ FBSBGT' },
  { parentId: 241, parentName: 'GG SOL BGT', name: 'KHOÁ MẸ & BÉ GGSBGT' },
  { parentId: 242, parentName: 'HL FB SOL BGT', name: 'KHOÁ MẸ & BÉ HLFBSBGT' },
  { parentId: 243, parentName: 'HL WEB SOL BGT', name: 'KHOÁ MẸ & BÉ HLWEBSBGT' },
  { parentId: 244, parentName: 'HL VL SOL BGT', name: 'KHOÁ MẸ & BÉ HLVLSBGT' },
  { parentId: 245, parentName: 'TIKTOK SOL BGT', name: 'KHOÁ MẸ & BÉ TTSBGT' }
];

async function getAccessToken(): Promise<string> {
  const creds = JSON.parse(fs.readFileSync('google-service-account.json', 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(creds.private_key, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;

  const res = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });
  return res.data.access_token;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${mins}:${secs}`;
}

async function main() {
  console.log('🚀 Bootstrapping NestJS context to add detailed sources & sync Google Sheets...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log(`\n📌 Phase 1: Thêm ${itemsToAdd.length} nguồn chi tiết "KHOÁ MẸ & BÉ" vào VTTech CRM...\n`);

  let successCount = 0;
  for (let i = 0; i < itemsToAdd.length; i++) {
    const item = itemsToAdd[i];
    const payload = JSON.stringify({
      Name: item.name,
      Note: '',
      Type: String(item.parentId)
    });

    try {
      const res = await vttechApi.callHandler('/Marketing/TicketSourceTypeDetail', 'Excute', {
        CurrentID: '0',
        data: payload
      }, 'CHIKIET');

      const decomp = vttechApi.decompress(res);
      const resVal = Array.isArray(decomp) ? decomp[0]?.result : decomp?.result;
      if (resVal !== -1) {
        successCount++;
        console.log(`✅ [${i + 1}/${itemsToAdd.length}] Thêm thành công "${item.name}" -> Nguồn Cha: ${item.parentName} (ID:${item.parentId})`);
      } else {
        console.log(`⚠️ [${i + 1}/${itemsToAdd.length}] Trùng dữ liệu hoặc thất bại khi thêm "${item.name}"`);
      }
    } catch (e: any) {
      console.error(`❌ Lỗi [${item.name}]:`, e.message);
    }
  }

  console.log(`\n🎉 Hoàn thành Phase 1: Thêm ${successCount}/${itemsToAdd.length} nguồn chi tiết vào VTTech.`);

  // Phase 2: Fetch fresh data from VTTech
  console.log('\n📌 Phase 2: Tải dữ liệu mới nhất từ VTTech CRM...');
  const freshRes = await vttechApi.callHandler('/Marketing/TicketSourceList/', 'LoadData', {}, 'CHIKIET');
  if (!freshRes) {
    throw new Error('Không thể tải dữ liệu mới từ VTTech!');
  }

  const freshData = vttechApi.decompress(freshRes);
  const table = freshData.Table || [];
  const table1 = freshData.Table1 || [];

  console.log(`Tải thành công: Table (Nguồn cha) = ${table.length}, Table1 (Nguồn chi tiết) = ${table1.length}`);
  fs.writeFileSync('scratch/sources_chikiet.json', JSON.stringify(freshData, null, 2));

  // Phase 3: Push updated data to Google Sheets
  console.log('\n📌 Phase 3: Đẩy toàn bộ dữ liệu mới nhất lên Google Sheets...');

  const catMap = new Map<number, string>();
  table.forEach((c: any) => catMap.set(c.ID, c.Name));

  const parentSourcesMap = new Map<number, any>();
  table1.forEach((item: any) => {
    const parentId = item.ID;
    if (!parentSourcesMap.has(parentId)) {
      const catId = item.TypeCat_ID || 0;
      const catName = catMap.get(catId) || (catId === 0 ? 'Khác' : `Nhóm #${catId}`);
      parentSourcesMap.set(parentId, {
        id: parentId,
        name: item.Name || '',
        catId,
        catName,
        note: item.Note || '',
        dayEditor: formatDate(item.DayEditor),
        details: []
      });
    }

    if (item.TypeDetailID || item.TypeDetailName) {
      parentSourcesMap.get(parentId)!.details.push({
        detailId: item.TypeDetailID || '',
        detailName: item.TypeDetailName || '',
        noteDetail: item.NoteDetail || '',
        dayEditorDetail: formatDate(item.DayEditorDetail)
      });
    }
  });

  const tab1Header = [
    'STT', 'ID Nhóm', 'Nhóm Nguồn', 'ID Nguồn', 'Tên Nguồn Khách Hàng', 'Ghi Chú Nguồn',
    'ID Nguồn Chi Tiết', 'Tên Nguồn Khách Hàng Chi Tiết', 'Ghi Chú Chi Tiết', 'Ngày Cập Nhật Chi Tiết'
  ];

  const tab1Rows: any[][] = [];
  let stt1 = 0;
  for (const [parentId, pSource] of parentSourcesMap.entries()) {
    if (pSource.details.length === 0) {
      stt1++;
      tab1Rows.push([stt1, pSource.catId, pSource.catName, pSource.id, pSource.name, pSource.note, '', '(Không có nguồn chi tiết)', '', pSource.dayEditor]);
    } else {
      for (const d of pSource.details) {
        stt1++;
        tab1Rows.push([stt1, pSource.catId, pSource.catName, pSource.id, pSource.name, pSource.note, d.detailId, d.detailName, d.noteDetail, d.dayEditorDetail]);
      }
    }
  }

  const tab2Header = ['STT', 'ID Nhóm', 'Nhóm Nguồn', 'ID Nguồn', 'Tên Nguồn Khách Hàng', 'Ghi Chú Nguồn', 'Số Nguồn Chi Tiết', 'Ngày Cập Nhật Nguồn'];
  const tab2Rows: any[][] = [];
  let stt2 = 0;
  for (const [parentId, pSource] of parentSourcesMap.entries()) {
    stt2++;
    tab2Rows.push([stt2, pSource.catId, pSource.catName, pSource.id, pSource.name, pSource.note, pSource.details.length, pSource.dayEditor]);
  }

  const gToken = await getAccessToken();
  const gHeaders = { Authorization: `Bearer ${gToken}` };
  const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

  const metaRes = await axios.get(sheetsUrl, { headers: gHeaders });
  const sheetsList = metaRes.data.sheets || [];
  const updatedMap = new Map<string, number>();
  sheetsList.forEach((s: any) => updatedMap.set(s.properties.title, s.properties.sheetId));

  const tab1Title = 'Nguồn Khách Hàng Chi Tiết';
  const tab2Title = 'Danh Sách Nguồn Khách Hàng';
  const idTab1 = updatedMap.get(tab1Title)!;
  const idTab2 = updatedMap.get(tab2Title)!;

  async function writeAndFormatTab(sheetTitle: string, sheetId: number, header: string[], dataRows: any[][], numCols: number) {
    const allRows = [header, ...dataRows];
    const totalRows = allRows.length;

    await axios.post(`${sheetsUrl}:batchUpdate`, {
      requests: [{
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { rowCount: Math.max(100, totalRows + 20), columnCount: numCols } },
          fields: 'gridProperties(rowCount,columnCount)'
        }
      }]
    }, { headers: gHeaders });

    await axios.post(`${sheetsUrl}/values/'${sheetTitle}'!A1:Z:clear`, {}, { headers: gHeaders });
    await axios.put(`${sheetsUrl}/values/'${sheetTitle}'!A1?valueInputOption=USER_ENTERED`, { values: allRows }, { headers: gHeaders });

    const formatRequests: any[] = [
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.11, green: 0.21, blue: 0.36 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11 },
              horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
      },
      { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
      { setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, endRowIndex: totalRows, startColumnIndex: 0, endColumnIndex: numCols } } } },
      { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: numCols } } }
    ];

    await axios.post(`${sheetsUrl}:batchUpdate`, { requests: formatRequests }, { headers: gHeaders });
    console.log(`✅ Updated & Formatted Google Sheet Tab '${sheetTitle}' (Total ${dataRows.length} rows).`);
  }

  await writeAndFormatTab(tab1Title, idTab1, tab1Header, tab1Rows, 10);
  await writeAndFormatTab(tab2Title, idTab2, tab2Header, tab2Rows, 8);

  console.log(`\n🎉 TẤT CẢ ĐÃ HOÀN THÀNH XUẤT SẮC!`);
  console.log(`- Đã thêm thành công ${successCount} Nguồn Chi Tiết "KHOÁ MẸ & BÉ" trên VTTech CRM.`);
  console.log(`- Đã đồng bộ Google Sheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`);

  await app.close();
}

main().catch(console.error);
