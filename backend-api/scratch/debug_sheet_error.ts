import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';
import axios from 'axios';

async function main() {
  console.log('🚀 Khởi tạo NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ExcelExportService);

  const toStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const newSheetId = '1pjsiXsQYYpS6ebn4erJxfa3PAHZHURvAdXxeQkSy-Bg';
  const newFromStr = '2019-01-01';

  console.log('🔄 Trực tiếp gọi pushToGoogleSheet cho New Sheet để bắt lỗi...');
  try {
    await service.pushToGoogleSheet(newFromStr, toStr, newSheetId, true);
    console.log('✅ Success!');
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
