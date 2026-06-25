import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';

async function main() {
  console.log('🚀 Khởi tạo NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const excelExportService = app.get(ExcelExportService);
  
  console.log('🔄 Bắt đầu kích hoạt handleGoogleSheetPushCron()...');
  try {
    await excelExportService.handleGoogleSheetPushCron(true);
    console.log('✅ Chạy hoàn tất handleGoogleSheetPushCron!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Lỗi khi chạy cron job:', error.message, error.stack);
    process.exit(1);
  } finally {
    try {
      await app.close();
    } catch {}
  }
}

main().catch(err => {
  console.error('❌ Lỗi khởi tạo ứng dụng:', err);
  process.exit(1);
});
