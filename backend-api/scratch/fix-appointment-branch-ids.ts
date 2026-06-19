import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { ExcelExportService } from '../src/excel-export.service';

async function main() {
  console.log('Bootstrapping NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const exportService = app.get(ExcelExportService);

  console.log('Fetching branches...');
  const branches = await prisma.branch.findMany();
  const branchMap = new Map(branches.map(b => [b.name.toLowerCase().trim(), b.id]));

  console.log('Fetching appointments with null branch_id...');
  const appointments = await prisma.appointment.findMany({
    where: {
      branch_id: null,
      branch_name: { not: '' }
    }
  });

  console.log(`Found ${appointments.length} appointments with null branch_id.`);

  let updateCount = 0;
  for (const a of appointments) {
    if (!a.branch_name) continue;
    const key = a.branch_name.toLowerCase().trim();
    const bId = branchMap.get(key);
    if (bId) {
      await prisma.appointment.update({
        where: { id: a.id },
        data: { branch_id: bId }
      });
      updateCount++;
    } else {
      console.log(`Warning: Branch name "${a.branch_name}" not found in branch list.`);
    }
  }

  console.log(`Successfully updated ${updateCount} appointments with correct branch_id!`);

  // After updating DB, push to Google Sheets
  console.log('\nNow pushing updated data to Google Sheets...');
  const today = new Date().toISOString().split('T')[0];
  const result = await exportService.pushToGoogleSheet('2026-01-01', today);
  console.log(`Google Sheets updated successfully! URL: ${result.url}`);
  console.log(`Taza Rows: ${result.tazaCount}, Timona Rows: ${result.timonaCount}`);

  await app.close();
}

main().catch(console.error);
