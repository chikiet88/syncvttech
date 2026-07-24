import * as fs from 'fs';

async function main() {
  const data = JSON.parse(fs.readFileSync('scratch/sources_chikiet.json', 'utf8'));

  const table = data.Table || [];
  const table1 = data.Table1 || [];

  console.log('=== NHÓM NGUỒN (Table) ===');
  table.forEach((cat: any) => {
    console.log(`- ID: ${cat.ID} | Name: ${cat.Name} | TotalChildren: ${cat.TotalChildren}`);
  });

  console.log(`\nTotal Table1 rows: ${table1.length}`);

  // Group by Group ID (ID of source)
  const sourceGroupMap = new Map<number, { id: number, name: any, typeCatId: number, note: string, details: any[] }>();

  table1.forEach((item: any) => {
    const sourceId = item.ID;
    if (!sourceGroupMap.has(sourceId)) {
      sourceGroupMap.set(sourceId, {
        id: sourceId,
        name: item.Name,
        typeCatId: item.TypeCat_ID,
        note: item.Note || '',
        details: []
      });
    }

    if (item.TypeDetailID && item.TypeDetailName) {
      sourceGroupMap.get(sourceId)!.details.push({
        detailId: item.TypeDetailID,
        detailName: item.TypeDetailName,
        detailNote: item.NoteDetail || ''
      });
    }
  });

  console.log(`\nUnique Nguồn Khách Hàng (Sources): ${sourceGroupMap.size}`);

  let totalDetailCount = 0;
  for (const [id, s] of sourceGroupMap.entries()) {
    const catName = table.find((c: any) => c.ID === s.typeCatId)?.Name || `Cat #${s.typeCatId}`;
    console.log(`\n📌 Nguồn [ID ${id}]: "${s.name}" (Nhóm: ${catName}, Ghi chú: "${s.note}") -> Có ${s.details.length} nguồn chi tiết`);
    totalDetailCount += s.details.length;
    if (s.details.length > 0) {
      console.log(`   Sample chi tiết: ${s.details.slice(0, 3).map(d => `${d.detailName} (ID:${d.detailId})`).join(', ')}`);
    }
  }

  console.log(`\nTổng số Nguồn Chi Tiết: ${totalDetailCount}`);
}

main().catch(console.error);
