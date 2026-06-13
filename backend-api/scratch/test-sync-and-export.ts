import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import { ExcelExportService } from '../src/excel-export.service';
import * as fs from 'fs';

async function main() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Resolving services...');
  const syncService = app.get(SyncService);
  const exportService = app.get(ExcelExportService);
  
  const dateStr = '2026-06-07';
  
  console.log(`Starting sync for ${dateStr} (without details)...`);
  // syncByRange(dateFrom, dateTo, forceMaster, syncPbx, syncDetails)
  await syncService.syncByRange(dateStr, dateStr, false, false, false);
  console.log('Sync completed! Waiting 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log(`Generating Excel file for appointments on ${dateStr} after sync...`);
  const buffer = await exportService.exportAppointmentsToExcel(dateStr, dateStr);
  
  const outputPath = '/home/kata/Coding/apivttech/docs/yeucau/test_export_20260607_synced.xlsx';
  console.log(`Saving Excel sheet to ${outputPath}...`);
  fs.writeFileSync(outputPath, buffer);
  
  console.log('Verification completed successfully! Closing context...');
  await app.close();
}

main().catch(err => {
  console.error('Sync and export test failed:', err);
});
