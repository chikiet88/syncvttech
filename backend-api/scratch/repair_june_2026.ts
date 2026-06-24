import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';
import { VttechApiService } from '../src/vttech-api.service';
import { PrismaService } from '../src/prisma.service';
import { ExcelExportService } from '../src/excel-export.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  const vttechApi = app.get(VttechApiService);
  const prisma = app.get(PrismaService);
  const excelExportService = app.get(ExcelExportService);

  // 1. Force the API service to ONLY use ittest1 (which has full permissions)
  console.log('🔑 Configuring API service to use only "ittest1"...');
  const allSessions = (vttechApi as any).sessions;
  const ittest1Session = allSessions.find((s: any) => s.username === 'ittest1');
  if (!ittest1Session) {
    console.error('❌ "ittest1" session not found! Please check your .env configurations.');
    await app.close();
    return;
  }
  (vttechApi as any).sessions = [ittest1Session];
  console.log(`Sessions count configured: ${(vttechApi as any).sessions.length} (${(vttechApi as any).sessions[0].username})`);

  // Log in
  const loggedIn = await vttechApi.login();
  if (!loggedIn) {
    console.error('❌ Failed to login to VTTech API.');
    await app.close();
    return;
  }
  await vttechApi.getXsrfToken();

  const branches = await prisma.branch.findMany({ where: { is_active: 1 } });
  console.log(`Loaded ${branches.length} branches.`);

  // 2. Loop through all dates in June 2026 (June 1st to June 22nd)
  const dateFrom = new Date('2026-06-01');
  const dateTo = new Date('2026-06-22');
  const days: string[] = [];
  
  let curr = new Date(dateFrom);
  while (curr <= dateTo) {
    days.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  console.log(`📅 Prepared to sync appointments for ${days.length} days (June 1st to June 22nd)...`);

  for (const dateStr of days) {
    console.log(`\n📅 --- Syncing date: ${dateStr} ---`);
    for (const branch of branches) {
      try {
        // We cast to any to call the private syncAppointments method
        const customerIds = await (syncService as any).syncAppointments(dateStr, dateStr, branch.id);
        if (customerIds.length > 0) {
          console.log(`   ✅ Branch: [${branch.name}] (ID: ${branch.id}) -> Synced ${customerIds.length} appointments`);
        }
      } catch (e: any) {
        console.error(`   ❌ Error syncing branch ${branch.name} (ID: ${branch.id}) on ${dateStr}:`, e.message);
      }
    }
  }

  // 3. Find and repair customer name mismatches
  console.log('\n🔍 Finding customer name mismatches in database...');
  const mismatches = await prisma.$queryRawUnsafe(`
    SELECT a.id as appointment_id, a.customer_id, a.customer_name AS app_cust_name, c.name AS main_cust_name
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    WHERE a.customer_name <> c.name
      AND a.appointment_date >= '2026-06-01T00:00:00Z'
      AND a.appointment_date <= '2026-06-22T23:59:59Z'
  `) as any[];

  console.log(`Found ${mismatches.length} customer name mismatches for June.`);
  
  if (mismatches.length > 0) {
    console.log('🔧 Repairing name mismatches in "customers" table...');
    const updatedCustomerIds = new Set<number>();
    for (const match of mismatches) {
      const custId = match.customer_id;
      const correctName = match.app_cust_name;
      if (!updatedCustomerIds.has(custId) && correctName) {
        await prisma.customer.update({
          where: { id: custId },
          data: {
            name: correctName,
            updated_at: new Date()
          }
        });
        updatedCustomerIds.add(custId);
        console.log(`   - Updated Customer ID ${custId} name to "${correctName}" (was "${match.main_cust_name}")`);
      }
    }
    console.log(`✅ Completed repairing ${updatedCustomerIds.size} unique customer names.`);
  }

  // 4. Trigger Google Sheets push cron job to refresh the sheet
  console.log('\n🔄 Triggering handleGoogleSheetPushCron to refresh Google Sheets with corrected data...');
  try {
    await excelExportService.handleGoogleSheetPushCron();
    console.log('✅ Google Sheets successfully refreshed!');
  } catch (error: any) {
    console.error('❌ Error pushing to Google Sheets:', error.message);
  }

  await app.close();
  console.log('\n🎉 Repair finished successfully!');
}

main().catch(console.error);
