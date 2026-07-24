import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID = '14Q4MXk5l1ZgDXemDPBe0PCDIOlLbBgKuY7Vi2kugvpw';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'google-service-account.json');
const TARGET_MARKDOWN_PATH = '/home/kata/Coding/apivttech/docs/xulyvttechsite/IT-Chua-Fix-TongHop.md';

interface CaseData {
  sheetName: string;
  rowExcel: number;
  dateStr: string;
  dateParsed: Date | null;
  customerName: string;
  content: string;
  confirmCskh: string;
  confirmKeToan: string;
  confirmSaleAdmin: string;
  confirmSepDuyen: string;
  note: string;
  rawRow: Record<string, string>;
}

interface SplitActions {
  deleteStep: string;
  editStep: string;
  createStep: string;
}

// Function to parse date from string (e.g., "13/06/2026", "6/5/2026")
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [_, day, month, year] = dmyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const dmMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (dmMatch) {
    const [_, day, month] = dmMatch;
    return new Date(2026, parseInt(month) - 1, parseInt(day));
  }

  return null;
}

// Analyze the sale admin confirmation and split into three distinct columns
function parseItActions(confirmSaleAdmin: string, content: string, sheetName: string): SplitActions {
  const text = (confirmSaleAdmin || '').trim();
  
  let deleteStep = '-';
  let editStep = '-';
  let createStep = '-';

  if (!text) {
    // Deduce from user request if Sale Admin is empty (unlikely for these target cases but good fallback)
    const normalizedContent = content.toLowerCase();
    if (normalizedContent.includes('xóa bill') || normalizedContent.includes('xoá bill')) {
      deleteStep = `Xóa bill theo yêu cầu`;
    }
    return { deleteStep, editStep, createStep };
  }

  // Helper to normalize lines
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Case-by-case analysis since the text is structured but written in Vietnamese freeform
  const fullTextUpper = text.toUpperCase();

  // 1. TÂN PHÚ (Dòng 261)
  if (sheetName === 'TÂN PHÚ' && fullTextUpper.includes('PTSTPTZ20260506.11')) {
    deleteStep = `**XÓA Thanh toán:**<br>Mã TT: \`PTSTPTZ20260506.11\` (06-05-2026, Tiền Mặt, 500.000đ, Taza Skin Clinic Tân Phú)`;
    createStep = `**TẠO MỚI Thanh toán:**<br>Thu tiền 500.000đ, Tiền Mặt, Ngày 06-05-2026 vào tài khoản **Timona Tân Phú** (phân bổ cho DV \`SP20260503.372696\`)`;
  }
  // 2. TÂN PHÚ (Dòng 262)
  else if (sheetName === 'TÂN PHÚ' && fullTextUpper.includes('PTSTPTZ20260522.59')) {
    deleteStep = `**XÓA Thanh toán:**<br>Mã TT: \`PTSTPTZ20260522.59\` (22-05-2026, Chuyển Khoản - ACB Taza, 100.000đ, Taza Skin Clinic Tân Phú)<br>*(Note: Theo yêu cầu CN, cần xóa bill thanh toán PTSTPTZ20260522.60 do trùng)*`;
  }
  // 3. CN GÒ VẤP (Dòng 85)
  else if (sheetName === 'CN GÒ VẤP' && fullTextUpper.includes('SP20260417.369618')) {
    editStep = `**CHỈNH GIÁ KHÓA HỌC:**<br>Mã DV: \`SP20260417.369618\` (Combo Da Chuyên Sâu + Phun Xăm Chuyên Sâu)<br>- Giá cũ: 75.000.000đ<br>- Giá mới: **32.500.000đ** (Đổi sang khóa Da Chuyên Sâu)`;
  }
  // 4. CN GÒ VẤP (Dòng 86)
  else if (sheetName === 'CN GÒ VẤP' && fullTextUpper.includes('SP20260317.364328')) {
    editStep = `**CHỈNH DOANH SỐ KHÓA HỌC:**<br>Mã DV: \`SP20260317.364328\` (Khoá Da Chuyên Nghiệp)<br>- Doanh số cũ: 14.100.000đ<br>- Doanh số mới: **12.825.000đ** (Giảm 10% chiết khấu)`;
  }
  // 5. TIMONA CMT8 (Dòng 87)
  else if (sheetName === 'TIMONA CMT8' && fullTextUpper.includes('SP20260605.378557')) {
    editStep = `**CHỈNH DOANH SỐ KHÓA HỌC:**<br>Mã DV: \`SP20260605.378557\` (Khoá Da Chuyên Nghiệp)<br>- Doanh số cũ: 18.500.000đ<br>- Doanh số mới: **17.390.000đ** (Chiết khấu khi thanh toán hết nợ)`;
  }
  // 6. TIMONA CMT8 (Dòng 88)
  else if (sheetName === 'TIMONA CMT8' && fullTextUpper.includes('SP20260606.378647')) {
    editStep = `**CHỈNH DOANH SỐ 4 KHÓA HỌC:**<br>` +
      `1. \`SP20260606.378647\` (Khoá Da CN): 18.360.000đ → **17.452.000đ**<br>` +
      `2. \`SP20260606.378648\` (Phòng chống lây nhiễm): 3.300.000đ → **3.140.000đ**<br>` +
      `3. \`SP20260606.378649\` (Gội Đầu DS Nâng Cao): 5.400.000đ → **5.135.000đ**<br>` +
      `4. \`SP20260606.378650\` (Xoa Bóp Bấm Huyệt): 16.200.000đ → **15.395.000đ**`;
  }
  // 7. CN GÒ VẤP (Dòng 87)
  else if (sheetName === 'CN GÒ VẤP' && fullTextUpper.includes('PTSTGV20260613.20')) {
    deleteStep = `**XÓA Thanh toán trùng:**<br>Mã TT: \`PTSTGV20260613.20\` (13-06-2026, Chuyển Khoản - ACB Timona, 1.500.000đ, Timona Gò Vấp)`;
  }
  // Generic fallback if not hardcoded above
  else {
    deleteStep = lines.filter(l => l.toUpperCase().includes('XÓA')).join('<br>') || '-';
    editStep = lines.filter(l => l.toUpperCase().includes('CHỈNH') || l.toUpperCase().includes('SỬA')).join('<br>') || '-';
    createStep = lines.filter(l => l.toUpperCase().includes('TẠO') || l.toUpperCase().includes('MỚI')).join('<br>') || '-';
  }

  return { deleteStep, editStep, createStep };
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const allSheets = spreadsheet.data.sheets || [];

  const targetSheets = [
    'TAZA QUẬN 10', 'TIMONA CMT8', 'CN GÒ VẤP', 'BÌNH TÂN', 'CN THÙ ĐỨC', 'TÂN PHÚ'
  ];

  const allCases: CaseData[] = [];
  const cutoffDate = new Date(2026, 4, 1); // 01/05/2026 (month is 0-indexed, so 4 = May)

  for (const sheetMeta of allSheets) {
    const sheetName = sheetMeta.properties?.title;
    if (!sheetName || !targetSheets.includes(sheetName)) continue;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 3) continue;

    const headerRow = rows[1]; // row index 1 (second row is headers)

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      let hasItChuaFix = false;
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || '').trim().toUpperCase();
        if (val.includes('IT CHƯA FIX')) {
          hasItChuaFix = true;
          break;
        }
      }

      if (!hasItChuaFix) continue;

      // Extract field data
      const getVal = (headerName: string): string => {
        const idx = headerRow.findIndex((h: string) => String(h || '').trim().toLowerCase().includes(headerName.toLowerCase()));
        return idx !== -1 ? String(row[idx] || '').trim() : '';
      };

      const dateStr = getVal('ngày cn gửi thông tin');
      const dateParsed = parseDate(dateStr);

      const customerName = getVal('trường hợp chỉnh sửa bill') || getVal('tên hv') || getVal('tên kh') || 'N/A';
      const content = getVal('nội dung cần it điều chỉnh') || getVal('nội dung cần it');
      const confirmCskh = getVal('xác nhận của cskh');
      const confirmKeToan = getVal('xác nhận của kế toán');
      const confirmSaleAdmin = getVal('xác nhận sale admin');
      const confirmSepDuyen = getVal('xác nhận của sếp duyên') || getVal('sếp duyên');
      const note = getVal('note');

      // Put everything in a raw object for backup
      const rawRow: Record<string, string> = {};
      headerRow.forEach((h: string, idx: number) => {
        if (h) rawRow[h.trim()] = String(row[idx] || '').trim();
      });

      allCases.push({
        sheetName,
        rowExcel: i + 1,
        dateStr,
        dateParsed,
        customerName,
        content,
        confirmCskh,
        confirmKeToan,
        confirmSaleAdmin,
        confirmSepDuyen,
        note,
        rawRow
      });
    }
  }

  // Filter cases >= 01/05/2026
  const filteredCases = allCases.filter(c => {
    if (!c.dateParsed) {
      console.warn(`Could not parse date for case: ${c.sheetName} Row ${c.rowExcel} ("${c.dateStr}")`);
      return false;
    }
    return c.dateParsed >= cutoffDate;
  });

  // Sort by date ascending
  filteredCases.sort((a, b) => (a.dateParsed?.getTime() || 0) - (b.dateParsed?.getTime() || 0));

  console.log(`\nFiltered down to ${filteredCases.length} cases from 01/05/2026 to present.`);

  // Generate Markdown
  let markdown = `# Tổng hợp dữ liệu "IT Chưa Fix" (Từ 01/05/2026 đến nay)

> **Nguồn**: [Google Sheets - Chỉnh sửa/Xóa Bill](https://docs.google.com/spreadsheets/d/14Q4MXk5l1ZgDXemDPBe0PCDIOlLbBgKuY7Vi2kugvpw/edit?gid=1547219026#gid=1547219026)
> **Thời gian lọc**: Từ 01/05/2026 đến hiện tại (Ngày chạy báo cáo: 26/06/2026)
> **Tổng số trường hợp chưa xử lý**: ${filteredCases.length}

---

## 1. Thống kê theo Chi nhánh

| Chi nhánh | Số lượng |
|---|---|
`;

  const counts: Record<string, number> = {};
  filteredCases.forEach(c => {
    counts[c.sheetName] = (counts[c.sheetName] || 0) + 1;
  });

  Object.entries(counts).forEach(([name, count]) => {
    markdown += `| ${name} | ${count} |\n`;
  });
  markdown += `| **Tổng cộng** | **${filteredCases.length}** |\n\n---\n\n## 2. Bảng phân tích các bước xử lý cho IT (IT Actions Map)\n\n`;
  
  // Header of the main summary/steps table split into step-by-step columns
  markdown += `| # | Chi nhánh (Dòng) | Khách hàng/Học viên | Ngày gửi | Bước 1: XÓA / HỦY (Thanh toán, Dịch vụ cũ) | Bước 2: CHỈNH SỬA (Giá, Doanh số, Tên DV) | Bước 3: TẠO MỚI (Thanh toán, Dịch vụ mới) |\n`;
  markdown += `|---|---|---|---|---|---|---|\n`;

  filteredCases.forEach((c, idx) => {
    const actions = parseItActions(c.confirmSaleAdmin, c.content, c.sheetName);
    markdown += `| ${idx + 1} | **${c.sheetName}**<br>(Dòng ${c.rowExcel}) | ${c.customerName.replace(/\r?\n/g, ' ')} | ${c.dateStr} | ${actions.deleteStep} | ${actions.editStep} | ${actions.createStep} |\n`;
  });

  markdown += `\n---\n\n## 3. Danh sách tóm tắt nhanh\n\n`;
  markdown += `| # | Ngày gửi | Chi nhánh | Dòng | Khách hàng/Học viên | Tóm tắt nội dung yêu cầu ban đầu |\n`;
  markdown += `|---|---|---|---|---|---|\n`;

  filteredCases.forEach((c, idx) => {
    const summary = c.content.replace(/\r?\n/g, ' ').substring(0, 120) + (c.content.length > 120 ? '...' : '');
    markdown += `| ${idx + 1} | ${c.dateStr} | ${c.sheetName} | ${c.rowExcel} | ${c.customerName.replace(/\r?\n/g, ' ')} | ${summary} |\n`;
  });

  markdown += `\n---\n\n## 4. Chi tiết các trường hợp cần xử lý\n\n`;

  filteredCases.forEach((c, idx) => {
    markdown += `### Case #${idx + 1}: ${c.sheetName} (Dòng ${c.rowExcel})\n\n`;
    markdown += `* **Ngày gửi**: ${c.dateStr}\n`;
    markdown += `* **Khách hàng/Học viên**: ${c.customerName.replace(/\r?\n/g, ' ')}\n`;
    markdown += `* **Nội dung yêu cầu**:\n\`\`\`text\n${c.content}\n\`\`\`\n\n`;

    if (c.confirmCskh) markdown += `* **Xác nhận CSKH**: ${c.confirmCskh}\n`;
    if (c.confirmKeToan) markdown += `* **Xác nhận Kế toán**: ${c.confirmKeToan}\n`;
    if (c.confirmSaleAdmin) {
      markdown += `* **Xác nhận Sale Admin**:\n\`\`\`text\n${c.confirmSaleAdmin}\n\`\`\`\n`;
    }
    if (c.confirmSepDuyen) markdown += `* **Sếp Duyên duyệt**: ${c.confirmSepDuyen}\n`;
    markdown += `* **Trạng thái**: 🔴 **${c.note}**\n\n`;
    markdown += `---\n\n`;
  });

  fs.writeFileSync(TARGET_MARKDOWN_PATH, markdown, 'utf-8');
  console.log(`Successfully generated markdown and wrote to: ${TARGET_MARKDOWN_PATH}`);
}

main().catch(console.error);
