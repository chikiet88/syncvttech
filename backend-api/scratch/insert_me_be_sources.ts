import axios from 'axios';
import * as cheerio from 'cheerio';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as crypto from 'crypto';

function decompress(data: any): any {
  if (!data || typeof data !== 'string') return data;
  try {
    const clean = data.replace(/^"|"$/g, '');
    const buf = Buffer.from(clean, 'base64');
    try { return JSON.parse(zlib.gunzipSync(buf).toString('utf-8')); }
    catch { try { return JSON.parse(zlib.inflateSync(buf).toString('utf-8')); }
    catch { return JSON.parse(zlib.inflateRawSync(buf).toString('utf-8')); } }
  } catch { try { return JSON.parse(data); } catch { return data; } }
}

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

async function main() {
  const baseUrl = 'https://tmtaza.vttechsolution.com';
  const username = 'CHIKIET';
  const password = '@hikiet88';

  const cookies: string[] = ['.AspNetCore.Culture=c%3Den-US%7Cuic%3Dvi'];

  function updateCookies(setCookieHeader: string[] | undefined) {
    if (!setCookieHeader) return;
    for (const raw of setCookieHeader) {
      const first = raw.split(';')[0];
      const [name] = first.split('=');
      if (!name) continue;
      const idx = cookies.findIndex(c => c.startsWith(name + '='));
      if (idx !== -1) cookies[idx] = first;
      else cookies.push(first);
    }
  }

  console.log(`🔑 Logging into ${baseUrl} as ${username}...`);

  // 1. Get Login Page
  const loginPageRes = await axios.get(`${baseUrl}/Login/Login?ver=${Date.now()}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Cookie': cookies.join('; ') }
  });
  updateCookies(loginPageRes.headers['set-cookie']);

  let secretKey = '';
  let xsrfToken = '';
  if (typeof loginPageRes.data === 'string') {
    const $ = cheerio.load(loginPageRes.data);
    const scriptContent = $('script').map((_, el) => $(el).html()).get().join('\n');
    const skMatch = scriptContent.match(/sys_SecretKey\s*=\s*['"]([^'"]+)['"]/i) ||
                    scriptContent.match(/SecretKey\s*[:=]\s*['"]([^'"]+)['"]/i);
    if (skMatch && skMatch[1]) secretKey = skMatch[1];
    xsrfToken = ($('input[name="__RequestVerificationToken"]').val() as string) || '';
  }

  // 2. Perform Login
  const loginRes = await axios.post(`${baseUrl}/api/Author/Login`, {
    UserName: username, Password: password, PasswordEnCrypt: "", IP: "", TokenFCM: "", From: "", SSO: "", Lan: "vi", TokenSSO: ""
  }, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Referer': `${baseUrl}/Login/Login/`,
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookies.join('; ')
    }
  });

  updateCookies(loginRes.headers['set-cookie']);
  const token = loginRes.data?.Session;
  if (!token) throw new Error('Login failed: Token null');

  for (const cName of ['WebToken', 'Token', 'token']) {
    cookies.push(`${cName}=${token}`);
  }

  // 3. GET /Marketing/TicketSourceTypeDetail?CurrentType=62 to get page xsrfToken
  console.log('📡 Fetching TicketSourceTypeDetail page to obtain verification token...');
  const pageRes = await axios.get(`${baseUrl}/Marketing/TicketSourceTypeDetail?CurrentType=62&ver=${Date.now()}`, {
    headers: {
      'Cookie': cookies.join('; '),
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Authorization': `Bearer ${token}`
    }
  });
  updateCookies(pageRes.headers['set-cookie']);
  if (typeof pageRes.data === 'string') {
    const $ = cheerio.load(pageRes.data);
    const formToken = $('input[name="__RequestVerificationToken"]').val() as string;
    if (formToken) xsrfToken = formToken;
  }

  console.log('Token ready. XSRF token length:', xsrfToken.length);

  const reqHeaders: any = {
    'Cookie': cookies.join('; '),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': '*/*',
    'Referer': `${baseUrl}/Marketing/TicketSourceList`,
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  if (secretKey) reqHeaders['secretkey'] = secretKey;
  if (xsrfToken) {
    reqHeaders['xsrf-token'] = xsrfToken;
    reqHeaders['RequestVerificationToken'] = xsrfToken;
  }

  // 4. Loop and Add Each Item
  console.log(`\n🚀 Bắt đầu thêm ${itemsToAdd.length} nguồn chi tiết cho "KHOÁ MẸ & BÉ" vào VTTech...\n`);

  let addedCount = 0;
  for (let i = 0; i < itemsToAdd.length; i++) {
    const item = itemsToAdd[i];
    const payloadData = JSON.stringify({
      Name: item.name,
      Note: "",
      Type: String(item.parentId)
    });

    const formBody = new URLSearchParams();
    formBody.append('CurrentID', '0');
    formBody.append('data', payloadData);
    if (xsrfToken) formBody.append('__RequestVerificationToken', xsrfToken);

    try {
      const res = await axios.post(`${baseUrl}/Marketing/TicketSourceTypeDetail/?handler=Excute`, formBody.toString(), {
        headers: reqHeaders
      });

      const decomp = decompress(res.data);
      console.log(`[${i + 1}/${itemsToAdd.length}] Nguồn Cha: ${item.parentName} (ID:${item.parentId}) -> Thêm "${item.name}":`, JSON.stringify(decomp));
      addedCount++;
    } catch (e: any) {
      console.error(`❌ Lỗi thêm [${item.name}]:`, e.message);
    }

    await new Promise(r => setTimeout(r, 200)); // Short delay between requests
  }

  console.log(`\n✅ Đã thêm xong ${addedCount}/${itemsToAdd.length} Nguồn Chi Tiết vào VTTech CRM.`);

  // 5. Re-fetch fresh data from VTTech
  console.log('\n📡 Đang tải dữ liệu mới từ VTTech CRM...');
  const formBodyLoad = new URLSearchParams();
  if (xsrfToken) formBodyLoad.append('__RequestVerificationToken', xsrfToken);

  const freshRes = await axios.post(`${baseUrl}/Marketing/TicketSourceList/?handler=LoadData`, formBodyLoad.toString(), {
    headers: reqHeaders
  });

  const freshData = decompress(freshRes.data);
  console.log(`Fresh data fetched: Table (Nguồn cha) = ${freshData.Table?.length}, Table1 (Chi tiết) = ${freshData.Table1?.length}`);
  fs.writeFileSync('scratch/sources_chikiet.json', JSON.stringify(freshData, null, 2));

  // 6. Update Google Sheets
  console.log('\n📤 Cập nhật dữ liệu mới lên Google Sheets...');
  const SPREADSHEET_ID = '1O3uYIsgXE25HHRe3a89lrXDx-47STR00N0jgy4iHxWQ';

  // Run push_sources_to_gsheet logic
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

  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });
  const gToken = tokenRes.data.access_token;
  const gHeaders = { Authorization: `Bearer ${gToken}` };
  const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

  // Process data for sheets
  const table = freshData.Table || [];
  const table1 = freshData.Table1 || [];

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

  const updatedMeta = await axios.get(sheetsUrl, { headers: gHeaders });
  const updatedSheets = updatedMeta.data.sheets || [];
  const updatedMap = new Map<string, number>();
  updatedSheets.forEach((s: any) => updatedMap.set(s.properties.title, s.properties.sheetId));

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

  console.log(`\n🎉 HOÀN THÀNH TẤT CẢ! Đã thêm 20 nguồn chi tiết cho "KHOÁ MẸ & BÉ" và cập nhật Google Sheet:`);
  console.log(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`);
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

main().catch(console.error);
