import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';

async function main() {
  console.log('🧪 Bắt đầu End-to-End Review & Test cho Cronjob Google Sheets...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ExcelExportService);

  console.log('⚡ Kích hoạt thử nghiệm toàn bộ luồng handleGoogleSheetPushCron()...');
  const startTime = Date.now();
  try {
    await service.handleGoogleSheetPushCron(false);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ [SUCCESS] Toàn bộ luồng Cronjob đã thực thi thành công hoàn hảo trong ${duration} giây!`);
  } catch (error: any) {
    console.error('\n❌ [ERROR] Phát hiện lỗi trong luồng Cronjob:', error.message, error.stack);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
