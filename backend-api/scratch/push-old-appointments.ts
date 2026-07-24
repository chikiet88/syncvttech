import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';

async function main() {
  console.log('🚀 Khởi tạo NestJS Context cho Old Appointments Push...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const service = app.get(ExcelExportService);

    // Báo cáo cũ (Filtered Appointments - Old Sheet)
    const oldSheetId = '1G_R_JeKOQhvKj_F_fXmfSfsgIupYyJmgvq22s2Jk7GU';
    const oldFromStr = '2026-01-01';
    const toStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

    console.log(`🔄 Đang đẩy dữ liệu báo cáo lịch hẹn lên Google Sheets: ${oldFromStr} -> ${toStr} (Sheet ID: ${oldSheetId})...`);
    
    // Đẩy dữ liệu lịch hẹn đã lọc lên Old Sheet
    const result = await service.pushToGoogleSheet(oldFromStr, toStr, oldSheetId, false, false);
    
    console.log('✅ Hoàn tất đẩy dữ liệu Old Sheet!');
    console.log(`- Taza Count: ${result.tazaCount}`);
    console.log(`- Timona Count: ${result.timonaCount}`);
    console.log(`- URL: ${result.url}`);
  } catch (error: any) {
    console.error('❌ Lỗi xảy ra:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
  } finally {
    await app.close();
  }
}

main().catch(console.error);
