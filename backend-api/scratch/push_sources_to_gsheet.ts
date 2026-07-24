import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

const SPREADSHEET_ID = '1O3uYIsgXE25HHRe3a89lrXDx-47STR00N0jgy4iHxWQ';

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
  const rawData = JSON.parse(fs.readFileSync('scratch/sources_chikiet.json', 'utf8'));
  const table = rawData.Table || [];
  const table1 = rawData.Table1 || [];

  const catMap = new Map<number, string>();
  table.forEach((c: any) => catMap.set(c.ID, c.Name));

  // Build Parent Sources map
  const parentSourcesMap = new Map<number, {
    id: number,
    name: string,
    catId: number,
    catName: string,
    note: string,
    dayEditor: string,
    details: any[]
  }>();

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

  // Prepare Tab 1: Detailed Sources data rows
  const tab1Header = [
    'STT',
    'ID Nhóm',
    'Nhóm Nguồn',
    'ID Nguồn',
    'Tên Nguồn Khách Hàng',
    'Ghi Chú Nguồn',
    'ID Nguồn Chi Tiết',
    'Tên Nguồn Khách Hàng Chi Tiết',
    'Ghi Chú Chi Tiết',
    'Ngày Cập Nhật Chi Tiết'
  ];

  const tab1Rows: any[][] = [];
  let stt1 = 0;

  for (const [parentId, pSource] of parentSourcesMap.entries()) {
    if (pSource.details.length === 0) {
      stt1++;
      tab1Rows.push([
        stt1,
        pSource.catId,
        pSource.catName,
        pSource.id,
        pSource.name,
        pSource.note,
        '',
        '(Không có nguồn chi tiết)',
        '',
        pSource.dayEditor
      ]);
    } else {
      for (const d of pSource.details) {
        stt1++;
        tab1Rows.push([
          stt1,
          pSource.catId,
          pSource.catName,
          pSource.id,
          pSource.name,
          pSource.note,
          d.detailId,
          d.detailName,
          d.noteDetail,
          d.dayEditorDetail
        ]);
      }
    }
  }

  // Prepare Tab 2: Parent Sources Summary data rows
  const tab2Header = [
    'STT',
    'ID Nhóm',
    'Nhóm Nguồn',
    'ID Nguồn',
    'Tên Nguồn Khách Hàng',
    'Ghi Chú Nguồn',
    'Số Nguồn Chi Tiết',
    'Ngày Cập Nhật Nguồn'
  ];

  const tab2Rows: any[][] = [];
  let stt2 = 0;
  for (const [parentId, pSource] of parentSourcesMap.entries()) {
    stt2++;
    tab2Rows.push([
      stt2,
      pSource.catId,
      pSource.catName,
      pSource.id,
      pSource.name,
      pSource.note,
      pSource.details.length,
      pSource.dayEditor
    ]);
  }

  console.log(`Tab 1 (Chi tiết) total data rows: ${tab1Rows.length}`);
  console.log(`Tab 2 (Tổng hợp) total data rows: ${tab2Rows.length}`);

  // Connect to Google Sheets API
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

  // Get current spreadsheet metadata
  const metaRes = await axios.get(sheetsUrl, { headers });
  const existingSheets = metaRes.data.sheets || [];
  const sheetMap = new Map<string, number>();
  existingSheets.forEach((s: any) => sheetMap.set(s.properties.title, s.properties.sheetId));

  const tab1Title = 'Nguồn Khách Hàng Chi Tiết';
  const tab2Title = 'Danh Sách Nguồn Khách Hàng';

  // 1. Rename existing default sheet or create tabs
  const requests: any[] = [];

  if (sheetMap.has('Trang tính1')) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheetMap.get('Trang tính1'),
          title: tab1Title
        },
        fields: 'title'
      }
    });
    sheetMap.set(tab1Title, sheetMap.get('Trang tính1')!);
    sheetMap.delete('Trang tính1');
  } else if (!sheetMap.has(tab1Title)) {
    requests.push({
      addSheet: { properties: { title: tab1Title } }
    });
  }

  if (!sheetMap.has(tab2Title)) {
    requests.push({
      addSheet: { properties: { title: tab2Title } }
    });
  }

  if (requests.length > 0) {
    await axios.post(`${sheetsUrl}:batchUpdate`, { requests }, { headers });
    console.log('Updated sheet structure / titles.');
  }

  // Refresh metadata to get updated sheet IDs
  const updatedMeta = await axios.get(sheetsUrl, { headers });
  const updatedSheets = updatedMeta.data.sheets || [];
  const updatedMap = new Map<string, number>();
  updatedSheets.forEach((s: any) => updatedMap.set(s.properties.title, s.properties.sheetId));

  const idTab1 = updatedMap.get(tab1Title)!;
  const idTab2 = updatedMap.get(tab2Title)!;

  // Function to update and format a tab
  async function writeAndFormatTab(sheetTitle: string, sheetId: number, header: string[], dataRows: any[][], numCols: number) {
    const allRows = [header, ...dataRows];
    const totalRows = allRows.length;

    // Resize grid
    await axios.post(`${sheetsUrl}:batchUpdate`, {
      requests: [{
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: {
              rowCount: Math.max(100, totalRows + 20),
              columnCount: numCols
            }
          },
          fields: 'gridProperties(rowCount,columnCount)'
        }
      }]
    }, { headers });

    // Clear content
    await axios.post(`${sheetsUrl}/values/'${sheetTitle}'!A1:Z:clear`, {}, { headers });

    // Write values
    await axios.put(`${sheetsUrl}/values/'${sheetTitle}'!A1?valueInputOption=USER_ENTERED`, {
      values: allRows
    }, { headers });

    // Formatting batch update
    const formatRequests: any[] = [
      // Format Header row
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: numCols
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.11, green: 0.21, blue: 0.36 }, // Dark Navy #1B365D
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 },
                fontSize: 11
              },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
      },
      // Freeze header row
      {
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenRowCount: 1 }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      },
      // Set filter on header
      {
        setBasicFilter: {
          filter: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: totalRows,
              startColumnIndex: 0,
              endColumnIndex: numCols
            }
          }
        }
      },
      // Auto resize column width
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: numCols
          }
        }
      },
      // Alignments: STT, ID columns centered
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: totalRows,
            startColumnIndex: 0,
            endColumnIndex: 2
          },
          cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(horizontalAlignment)'
        }
      },
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: totalRows,
            startColumnIndex: 3,
            endColumnIndex: 4
          },
          cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(horizontalAlignment)'
        }
      }
    ];

    if (numCols >= 10) {
      // Align ID Nguồn Chi Tiết (col 6) and Date (col 9)
      formatRequests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: totalRows,
            startColumnIndex: 6,
            endColumnIndex: 7
          },
          cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(horizontalAlignment)'
        }
      });
      formatRequests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: totalRows,
            startColumnIndex: 9,
            endColumnIndex: 10
          },
          cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(horizontalAlignment)'
        }
      });
    }

    await axios.post(`${sheetsUrl}:batchUpdate`, { requests: formatRequests }, { headers });
    console.log(`✅ Completed writing & formatting for '${sheetTitle}'`);
  }

  // Push both tabs
  console.log(`📤 Pushing data to tab '${tab1Title}'...`);
  await writeAndFormatTab(tab1Title, idTab1, tab1Header, tab1Rows, 10);

  console.log(`📤 Pushing data to tab '${tab2Title}'...`);
  await writeAndFormatTab(tab2Title, idTab2, tab2Header, tab2Rows, 8);

  console.log(`\n🎉 ALL DONE! Google Sheet updated successfully:`);
  console.log(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`);
}

main().catch(console.error);
