import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';

const SPREADSHEET_ID = '1cI3vbQK1uEFjUQ2rd9BHTD_URM3-6ay2gAcg9cqz82s';
const CREDENTIALS_PATH = '/home/kata/Coding/singleapp/env/sandboxtazagroupvn-83daf10e5feb.json';

const COLORS = {
  headerBg: { red: 0.118, green: 0.161, blue: 0.231 }, // Navy Slate (#1E293B)
  headerText: { red: 1.0, green: 1.0, blue: 1.0 },
  rowEven: { red: 1.0, green: 1.0, blue: 1.0 },
  rowOdd: { red: 0.973, green: 0.98, blue: 0.988 },
  borderColor: { red: 0.886, green: 0.91, blue: 0.941 }
};

const sec7 = [
  ['STT', 'Hạng Mục Đề Xuất', 'Tần Suất / Chu Kỳ', 'Ngân Sách Dự Kiến', 'Mục Tiêu & Lợi Ích', 'Ghi Chú Cho Nhân Sự Tiếp Quản'],
  [
    '1',
    'Cước viễn thông & SMS Brandname CMC Telecom',
    'Hàng tháng (Ngày 01 - 10)',
    '~10,000,000 - 12,000,000 VNĐ',
    'Duy trì dịch vụ GigaFone, SMS Brandname, Voice Brandname',
    'Lấy hóa đơn & cước phát sinh đầu tháng. Mã HĐ: 000565/2019, 005076/2022, 000572/2019, 004553/2024.'
  ],
  [
    '2',
    'Phần mềm Tổng đài ảo TACA (Gói 65 máy nhánh)',
    'Hàng tháng (Ngày 01 - 10)',
    '~7,150,000 VNĐ (Có VAT)',
    'Đảm bảo hệ thống tổng đài CSKH & Telecall hoạt động liên tục',
    'Thanh toán Cty TNHH Công nghệ TACA. MST: 0316132235, STK ACB: 10982857. Theo HĐ 25/2021/HĐDV/TACA.'
  ],
  [
    '3',
    'Tài khoản Google Workspace (tazagroup.net / tazagroup.vn)',
    'Hàng tháng (Ngày 05 - 10)',
    '~6,500,000 VNĐ (~$250 USD)',
    'Duy trì Email doanh nghiệp, Google Drive storage, Meet',
    'Thanh toán tự động qua Thẻ Visa quốc tế (****6683). Đã gồm ~4% phí giao dịch quốc tế.'
  ],
  [
    '4',
    'Cước duy trì & Quản lý đầu số 1900 (Đông Dương Telecom)',
    'Hàng tháng (Ngày 15 - 20)',
    '~770,000 VNĐ (Có VAT)',
    'Phí duy trì Hotline 19002664 & phí quản lý bổ sung',
    'Chuyển khoản Công ty cổ phần viễn thông Đông Dương Telecom. Ký hiệu HĐ: 1K26TCA.'
  ],
  [
    '5',
    'Gói Zalo Official Account (Zalo OA) CSKH',
    '6 Tháng / 1 Năm',
    '~1,400,000 VNĐ / Chi nhánh / 6T',
    'Duy trì trang Zalo OA truyền thông & CSKH các chi nhánh (Q10, Thủ Đức...)',
    'Rà soát thời hạn gói dịch vụ Zalo OA từng chi nhánh trước 15 ngày hết hạn. Thanh toán VNG.'
  ],
  [
    '6',
    'Tài khoản OpenAI ChatGPT Team / Plus',
    'Hàng tháng',
    '~550,000 - 800,000 VNĐ (~$20-30 USD)',
    'Phục vụ công việc Marketing, Content, R&D & AI Automation',
    'Thanh toán trực tuyến qua Thẻ Visa/Mastercard quốc tế.'
  ],
  [
    '7',
    'Gia hạn & Rà soát Domain / SSL / Hosting / VPS',
    'Hàng tháng (Ngày 01)',
    'Dựa trên chi phí thực tế',
    'Tránh gián đoạn dịch vụ các Website công ty (tazagroup.vn, tazagroup.net...)',
    'Rà soát danh sách Domain/SSL trước 15 ngày hết hạn. Tắt/hạ cấp các VPS Staging/Dev không sử dụng.'
  ],
  [
    '8',
    'Backup dữ liệu tự động (Database & Codebase)',
    'Hàng tuần / Hàng tháng',
    'Theo chi phí Cloud Storage',
    'Đảm bảo an toàn dữ liệu khi có sự cố Server',
    'Kiểm tra tính toàn vẹn của bản backup Google Drive / S3.'
  ],
  [
    '9',
    'Nâng cấp bảo mật & Vá lỗi hệ thống',
    'Hàng quý / Hàng tháng',
    'Nội bộ',
    'Ngăn chặn lỗ hổng SQL Injection, XSS, DDoS',
    'Check log Cloudflare WAF & cập nhật các gói NPM / Bun dependencies.'
  ],
  [
    '10',
    'Tự động hóa quy trình EAI & RAG Bot Support',
    'Hàng tháng',
    'Nội bộ',
    'Tăng tốc độ phản hồi CSKH & đào tạo nội bộ',
    'Nạp thêm dữ liệu tri thức mới vào Vector DB hàng tháng.'
  ],
  [
    '11',
    'Mua sắm / Nâng cấp Thiết bị CNTT (Phát sinh)',
    'Theo thực tế nhu cầu',
    'Dựa trên báo giá phê duyệt',
    'Bảo trì, nâng cấp ổ cứng, máy tính, thiết bị mạng cho nhân sự mới',
    'Lập DNTT đính kèm báo giá & biên bản giao nhận thiết bị (Nguyễn Công PC, Phong Vũ...).'
  ]
];

async function main() {
  console.log('🚀 Bắt đầu cập nhật dữ liệu vào Google Sheet 07_DeXuat_HangThang...');
  console.log(`📄 Spreadsheet ID: ${SPREADSHEET_ID}`);

  const credentialsRaw = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
  let credentials = JSON.parse(credentialsRaw);
  if (credentials.private_key && typeof credentials.private_key === 'string') {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n').trim();
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const token = tokenRes.token;

  if (!token) {
    throw new Error('Không thể lấy access token từ Google Cloud Service Account.');
  }

  // Fetch sheet metadata to find sheetId for 07_DeXuat_HangThang
  const getMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meta = await getMetaRes.json();
  const existingSheets = meta.sheets || [];
  const targetSheet = existingSheets.find((s: any) => s.properties.title === '07_DeXuat_HangThang');
  
  if (!targetSheet) {
    throw new Error('Tab "07_DeXuat_HangThang" không tồn tại trong Spreadsheet!');
  }
  const sheetId = targetSheet.properties.sheetId;

  // Clear existing values in 07_DeXuat_HangThang
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'07_DeXuat_HangThang'!A1:Z100:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    }
  );

  // Update new values
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'07_DeXuat_HangThang'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: sec7 })
    }
  );
  const updateData = await updateRes.json();
  console.log('✅ Đã cập nhật thành công dữ liệu values:', updateData);

  // Format UI styling
  const thinBorder = { style: 'SOLID', width: 1, color: COLORS.borderColor };
  const totalRows = sec7.length;
  const totalCols = 6;

  const formatRequests: any[] = [
    // Freeze header
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    // Header format
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLORS.headerBg,
            textFormat: { foregroundColor: COLORS.headerText, bold: true, fontSize: 11 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            padding: { top: 6, bottom: 6 }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
      }
    }
  ];

  // Data row styling
  for (let r = 1; r < totalRows; r++) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: totalCols },
        cell: {
          userEnteredFormat: {
            backgroundColor: r % 2 === 1 ? COLORS.rowEven : COLORS.rowOdd,
            textFormat: { fontSize: 10 },
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy,borders)'
      }
    });
  }

  // Centered columns (STT, Tần suất, Ngân sách)
  [0, 2, 3].forEach(colIdx => {
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: colIdx, endColumnIndex: colIdx + 1 },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat.horizontalAlignment'
      }
    });
  });

  // Column Widths
  const colWidths = [60, 280, 180, 200, 320, 380];
  colWidths.forEach((width, colIdx) => {
    formatRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: colIdx, endIndex: colIdx + 1 },
        properties: { pixelSize: width },
        fields: 'pixelSize'
      }
    });
  });

  // Apply batchUpdate
  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: formatRequests })
  });
  const batchData = await batchRes.json();
  if (batchData.error) {
    console.error('❌ Lỗi khi định dạng Google Sheet:', batchData.error);
  } else {
    console.log('🎉 ĐÃ CẬP NHẬT VÀ ĐỊNH DẠNG TAB 07_DeXuat_HangThang THÀNH CÔNG!');
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
