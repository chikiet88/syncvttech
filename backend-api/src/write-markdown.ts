import * as fs from 'fs';

async function main() {
  const rawData = fs.readFileSync('/home/kata/.gemini/antigravity-ide/brain/1d2f1d29-caf3-4129-9573-d1a4c1d125c2/.system_generated/steps/276/output.txt', 'utf-8');
  const lines = rawData.split('\n');
  const jsonStr = lines.slice(2, -1).join('\n'); // grab the JSON part
  const parsed = JSON.parse(jsonStr.trim());
  const data = parsed.finalResults;

  let mdContent = `# Danh Sách Nguồn Khách Hàng và Chi Tiết\n\n`;
  mdContent += `Hồ sơ tổng hợp tất cả các nguồn chi tiết (sub-sources) thuộc các nguồn chiến dịch được trích xuất trực tiếp từ hệ thống CRM VTTech sau khi cập nhật ngày **22-06-2026**.\n\n`;

  const keys = ['223', '240', '241', '242', '243', '244', '245'];
  const namesMap: Record<string, string> = {
    '223': 'SOL BGT',
    '240': 'FB SOL BGT',
    '241': 'GG SOL BGT',
    '242': 'HL FB SOL BGT',
    '243': 'HL WEB SOL BGT',
    '244': 'HL VL SOL BGT',
    '245': 'TIKTOK SOL BGT'
  };

  for (const key of keys) {
    const source = data[key];
    const parentName = namesMap[key];
    mdContent += `## Nguồn: **${parentName}** (ID: ${key})\n\n`;
    mdContent += `| STT | ID Chi Tiết | Tên Nguồn Chi Tiết | Người Cập Nhật | Ngày Cập Nhật | Ghi Chú |\n`;
    mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    
    const details = source.details;
    // Sort details alphabetically by name for readability
    details.sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi'));
    
    details.forEach((d: any, index: number) => {
      mdContent += `| ${index + 1} | ${d.id} | ${d.name} | ${d.editor} | ${d.date} | ${d.note || ''} |\n`;
    });
    
    mdContent += `\n`;
  }

  fs.writeFileSync('/home/kata/Coding/apivttech/docs/xulydulieu/nguonchitiet.md', mdContent);
  console.log('Successfully wrote to nguonchitiet.md');
}

main().catch(console.error);
