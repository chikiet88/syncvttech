import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';

async function main() {
  console.log('🚀 Khởi tạo NestJS Context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ExcelExportService);

  const toStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const sheet2026Id = '1Z6HrWtnH769ePrlgefuz-ls_ym0TXTOndEjx1MdF-Zo';
  const from2026Str = '2026-01-01';

  console.log(`🔄 Thử nghiệm đẩy dữ liệu 2026 (${from2026Str} -> ${toStr}) lên Sheet mới: ${sheet2026Id}...`);
  try {
    const res = await service.pushToGoogleSheet(from2026Str, toStr, sheet2026Id, true);
    console.log('✅ Thành công!', res);
  } catch (error: any) {
    console.error('❌ Lỗi khi đẩy dữ liệu:', error.message);
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
