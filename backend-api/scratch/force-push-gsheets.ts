import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';
import { GsheetReportService } from '../src/gsheet-report.service';

async function main() {
  console.log('🚀 Khởi tạo NestJS Context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const excelExportService = app.get(ExcelExportService);
    const gsheetReportService = app.get(GsheetReportService);

    console.log('🔄 1. Bắt đầu đẩy dữ liệu báo cáo lịch hẹn lên Google Sheets (Filtered Appointments - Old Sheet)...');
    // Chạy handleGoogleSheetPushCron(true) để đẩy dữ liệu cũ (Taza, Timona từ 2026-01-01 -> nay)
    await excelExportService.handleGoogleSheetPushCron(true);
    console.log('✅ Hoàn tất đẩy dữ liệu báo cáo lịch hẹn (Old Sheet)!');

    console.log('🔄 2. Bắt đầu chạy đối soát và đẩy khách hàng lên Google Sheets (Customer Sheet)...');
    const result = await gsheetReportService.compareAndPushData();
    console.log('✅ Hoàn tất đối soát và đẩy khách hàng!');
    console.log(`- Tổng KH trong DB: ${result.totalDb}`);
    console.log(`- Tổng KH trên Sheet: ${result.totalSheet}`);
    console.log(`- Số lượng KH mới đã đẩy thêm: ${result.difference}`);
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
