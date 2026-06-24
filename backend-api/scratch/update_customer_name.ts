import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { ExcelExportService } from '../src/excel-export.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const excelExportService = app.get(ExcelExportService);

  const customerId = 200394;
  const newName = 'ĐỖ NGUYỄN BẢO NGỌC';

  console.log(`\nUpdating Customer ${customerId} name to: ${newName}...`);
  try {
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: newName,
        updated_at: new Date(),
      },
    });
    console.log('✅ Customer updated in DB:', JSON.stringify(updatedCustomer, null, 2));

    console.log('🔄 Pushing updated data to Google Sheets...');
    await excelExportService.handleGoogleSheetPushCron();
    console.log('✅ Google Sheets push cron completed!');
  } catch (e: any) {
    console.error('❌ Error:', e);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
