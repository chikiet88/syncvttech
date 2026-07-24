import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

async function main() {
  console.log('🚀 Khởi tạo NestJS Context để ghi log thành công...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const prisma = app.get(PrismaService);
    const newLog = await prisma.crawlLog.create({
      data: {
        crawl_date: new Date(),
        crawl_type: 'handleGoogleSheetPushCron_Old',
        status: 'success',
        message: 'Đẩy thành công lịch hẹn (Bù mất điện 14/7): Taza (89 dòng), Timona (6 dòng)',
        records_count: 95,
        appointments_count: 95,
      }
    });
    console.log('✅ Đã ghi log thành công!', newLog.id);
  } catch (error: any) {
    console.error('❌ Lỗi xảy ra:', error.message);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
