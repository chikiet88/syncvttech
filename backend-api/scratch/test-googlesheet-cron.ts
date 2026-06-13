import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';

async function main() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Resolving ExcelExportService...');
  const exportService = app.get(ExcelExportService);
  
  console.log('Triggering handleGoogleSheetPushCron manually for testing...');
  await exportService.handleGoogleSheetPushCron();
  
  console.log('Completed manual trigger! Closing context...');
  await app.close();
}

main().catch(err => {
  console.error('Manual cron test failed:', err);
  process.exit(1);
});
