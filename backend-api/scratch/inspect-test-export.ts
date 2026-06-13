import * as ExcelJS from 'exceljs';

async function main() {
  const filePath = '/home/kata/Coding/apivttech/docs/yeucau/test_export_20260607_synced.xlsx';
  console.log(`Loading generated synced workbook: ${filePath}`);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.getWorksheet('LỊCH HẸN');
  if (!sheet) {
    console.error('Worksheet LỊCH HẸN not found!');
    return;
  }
  
  console.log(`Worksheet: "${sheet.name}"`);
  console.log(`Row count: ${sheet.rowCount}`);
  
  // Print first 10 rows in detail
  for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const cells: string[] = [];
    // read 10 columns
    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      cells.push(`${c}: ${cell.text}`);
    }
    console.log(`Row ${r}:`, cells);
  }
}

main().catch(err => console.error(err));
