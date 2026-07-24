import * as fs from 'fs';

async function main() {
  const data = JSON.parse(fs.readFileSync('scratch/sources_chikiet.json', 'utf8'));
  const table1 = data.Table1 || [];

  console.log('Searching for any existing "Mẹ", "Bé", "Mother", "Baby" sources in VTTech...\n');

  const matches = table1.filter((item: any) => {
    const name = (item.TypeDetailName || '') + ' ' + (item.Name || '');
    return name.toLowerCase().includes('mẹ') || name.toLowerCase().includes('bé') || name.toLowerCase().includes('me & be');
  });

  if (matches.length === 0) {
    console.log('✅ XÁC NHẬN: Chưa có bất kỳ nguồn chi tiết nào liên quan đến "MẸ & BÉ" trong hệ thống VTTech.');
  } else {
    console.log(`Đã tìm thấy ${matches.length} bản ghi liên quan:`);
    matches.forEach((m: any) => console.log(m));
  }
}

main().catch(console.error);
