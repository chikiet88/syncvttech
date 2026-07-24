import * as fs from 'fs';

async function main() {
  const data = JSON.parse(fs.readFileSync('scratch/sources_chikiet.json', 'utf8'));
  const table1 = data.Table1 || [];

  // Group by Parent Source ID & Name
  const parents = new Map<number, { id: number, name: string, note: string, details: string[] }>();

  table1.forEach((item: any) => {
    const pId = item.ID;
    if (!parents.has(pId)) {
      parents.set(pId, {
        id: pId,
        name: item.Name,
        note: item.Note || '',
        details: []
      });
    }
    if (item.TypeDetailName) {
      parents.get(pId)!.details.push(item.TypeDetailName);
    }
  });

  console.log('=== DANH SÁCH NGUỒN CHI TIẾT DỰ KIẾN CHO "KHOÁ MẸ & BÉ" ===\n');

  const generatedList: { parentId: number, parentName: string, detailName: string, suffix: string }[] = [];

  for (const [pId, pObj] of parents.entries()) {
    if (pObj.details.length === 0) continue; // Bỏ qua nguồn không có chi tiết

    // Determine suffix rule from existing courses in this parent
    let suffix = '';
    
    // Look at existing detail names to infer suffix
    const sample = pObj.details[0] || '';
    
    if (pObj.name === 'FB SOL CN') suffix = 'SOL CN';
    else if (pObj.name === 'FB SOL VP') suffix = 'FB';
    else if (pObj.name === 'Hotline FB') suffix = 'HFB';
    else if (pObj.name === 'Google') suffix = 'GG';
    else if (pObj.name === 'Tiktok') suffix = 'TT';
    else if (pObj.name === 'Hotline Web') suffix = 'HW';
    else if (pObj.name === 'SOL BGT') suffix = 'SBGT';
    else if (pObj.name === 'HOTLINE VÃNG LAI') suffix = 'VL';
    else if (pObj.name === 'DATA LẠNH') suffix = 'DL';
    else if (pObj.name === 'TELE TIMONA VP') suffix = 'MKTVP';
    else if (pObj.name === 'TELE TAZA OUT') suffix = 'TELE TZ OUT';
    else if (pObj.name === 'TUYỂN SINH OFF') suffix = 'OFF';
    else if (pObj.name === 'TELE SOL TA VP') suffix = 'TSVP';
    else if (pObj.name === 'TELE TAZA VP') suffix = 'TELE TAZA VP';
    else if (pObj.name === 'FB SOL BGT') suffix = 'FBSBGT';
    else if (pObj.name === 'GG SOL BGT') suffix = 'GGSBGT';
    else if (pObj.name === 'HL FB SOL BGT') suffix = 'HLFBSBGT';
    else if (pObj.name === 'HL WEB SOL BGT') suffix = 'HLWEBSBGT';
    else if (pObj.name === 'HL VL SOL BGT') suffix = 'HLVLSBGT';
    else if (pObj.name === 'TIKTOK SOL BGT') suffix = 'TTSBGT';
    else {
      // General fallback suffix extraction
      const parts = sample.split(' ');
      suffix = parts.slice(1).join(' ');
    }

    const detailName = suffix ? `KHOÁ MẸ & BÉ ${suffix}` : `KHOÁ MẸ & BÉ - ${pObj.name}`;
    generatedList.push({
      parentId: pId,
      parentName: pObj.name,
      detailName,
      suffix
    });
  }

  console.log(`Tổng số Nguồn Chi Tiết dự kiến cho "KHOÁ MẸ & BÉ": ${generatedList.length}\n`);
  
  generatedList.forEach((item, idx) => {
    console.log(`${idx + 1}. [Nguồn Cha: ${item.parentName} (ID:${item.parentId})] -> Tên Nguồn Chi Tiết: "${item.detailName}"`);
  });
}

main().catch(console.error);
