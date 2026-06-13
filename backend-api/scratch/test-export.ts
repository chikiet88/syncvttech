import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExcelExportService } from '../src/excel-export.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Resolving ExcelExportService...');
  const exportService = app.get(ExcelExportService);
  
  const dateStr = '2026-06-07';
  console.log(`Generating Excel file for appointments on ${dateStr}...`);
  const buffer = await exportService.exportAppointmentsToExcel(dateStr, dateStr);
  
  const outputPath = '/home/kata/Coding/apivttech/docs/yeucau/test_export_20260607.xlsx';
  console.log(`Saving Excel sheet to ${outputPath}...`);
  fs.writeFileSync(outputPath, buffer);
  
  console.log('Export successful! Closing context...');
  await app.close();
}

main().catch(err => {
  console.error('Test script failed:', err);
});
