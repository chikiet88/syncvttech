import * as fs from 'fs';

async function main() {
  const data = JSON.parse(fs.readFileSync('scratch/sources_chikiet.json', 'utf8'));
  const table1 = data.Table1 || [];

  // Find existing course names or patterns across parent sources
  const sourcePatterns = new Map<string, { parentId: number, parentName: string, note: string, sampleDetails: string[] }>();

  table1.forEach((item: any) => {
    const parentName = item.Name || '';
    if (!sourcePatterns.has(parentName)) {
      sourcePatterns.set(parentName, {
        parentId: item.ID,
        parentName,
        note: item.Note || '',
        sampleDetails: []
      });
    }
    if (item.TypeDetailName) {
      sourcePatterns.get(parentName)!.sampleDetails.push(item.TypeDetailName);
    }
  });

  console.log(`Analyzing naming patterns for ${sourcePatterns.size} Parent Sources:\n`);

  for (const [pName, pObj] of sourcePatterns.entries()) {
    console.log(`📌 Nguồn Cha: "${pName}" (Ghi chú: "${pObj.note}", Có ${pObj.sampleDetails.length} nguồn chi tiết)`);
    // Find course-like details in this parent
    const courseLike = pObj.sampleDetails.filter(d => 
      d.toLowerCase().includes('khóa') || d.toLowerCase().includes('khoá') || d.toLowerCase().includes('đông y') || d.toLowerCase().includes('mụn') || d.toLowerCase().includes('hifu') || d.toLowerCase().includes('vnl') || d.toLowerCase().includes('da') || d.toLowerCase().includes('gội')
    );
    console.log(`   Các nguồn chi tiết mẫu:`, courseLike.slice(0, 5).join(' | '));
  }
}

main().catch(console.error);
