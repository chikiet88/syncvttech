import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync.service';
import { PrismaService } from './prisma.service';
import { VttechApiService } from './vttech-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  console.log('🚀 Bootstrapping NestJS context for manual sync on 2026-06-16...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);
  const prisma = app.get(PrismaService);
  const vttechApi = app.get(VttechApiService);

  const targetDateStr = '2026-06-16';
  const targetDate = new Date(targetDateStr);

  // Get all PENDING tasks for 2026-06-16
  const pendingTasks = await prisma.syncTask.findMany({
    where: {
      date: targetDate,
      status: 'PENDING'
    }
  });

  // Sort pendingTasks so branch_id = 6 (TAZA Skin Clinic Đà Nẵng) is processed first
  pendingTasks.sort((a, b) => {
    if (a.branch_id === 6) return -1;
    if (b.branch_id === 6) return 1;
    return 0;
  });

  console.log(`Found ${pendingTasks.length} pending tasks to sync:`);
  pendingTasks.forEach(t => console.log(`- Task ${t.id} for Branch ${t.branch_name} (ID: ${t.branch_id})`));

  for (const task of pendingTasks) {
    console.log(`\n=== SYNCING BRANCH: ${task.branch_name} (ID: ${task.branch_id}) ===`);
    
    // Set status to PROCESSING
    await prisma.syncTask.update({
      where: { id: task.id },
      data: { status: 'PROCESSING', updated_at: new Date() }
    });

    try {
      // 1. Discover all customers and appointments
      console.log(`Discovering customers (Types 5, 2, 3) and appointments...`);
      const typesToSync = [5, 2, 3];
      const allFoundCustomerIds = new Set<number>();
      let customersFound = 0;

      for (const type of typesToSync) {
        // We use callHandler directly to avoid queuing details, or we can use internal syncService methods
        // Let's call syncCustomers from syncService
        const ids = await (syncService as any).syncCustomers(targetDateStr, targetDateStr, type, task.branch_id);
        ids.forEach((id: number) => allFoundCustomerIds.add(id));
        customersFound += ids.length;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const appointmentIds = await (syncService as any).syncAppointments(targetDateStr, targetDateStr, task.branch_id);
      appointmentIds.forEach((id: number) => allFoundCustomerIds.add(id));
      const appointmentsCount = appointmentIds.length;
      const totalRecords = customersFound + appointmentsCount;

      console.log(`Discovered: ${allFoundCustomerIds.size} customers, ${appointmentsCount} appointments.`);

      // 2. Sync Revenue
      let daySales = 0;
      let dayRevenue = 0;
      try {
        const res = await vttechApi.getRevenueByBranch(targetDateStr, targetDateStr, task.branch_id);
        const revItems = Array.isArray(res) ? res : [];
        for (let idx = 0; idx < revItems.length; idx++) {
          const item = revItems[idx];
          const mapped = (syncService as any).mapRevenueItem(item, task.branch_id, targetDateStr);
          daySales += mapped.amount;
          dayRevenue += mapped.paid;
          
          const baseId = parseInt(item.ID || item.id || item.PaymentID || item.OrderID || item.TabID) || 0;
          const currentHash = (syncService as any).generateHash(item);
          
          let tId: number | undefined = undefined;
          if (baseId > 0 && baseId < 2000000) {
              tId = baseId * 100 + (idx % 100); 
          }

          if (tId) {
             await prisma.revenueTransaction.upsert({
               where: { id: tId },
               update: { ...mapped, last_hash: currentHash },
               create: { ...mapped, id: tId, last_hash: currentHash }
             });
          } else {
             const existing = await prisma.revenueTransaction.findFirst({
               where: { branch_id: task.branch_id, last_hash: currentHash }
             });
             if (!existing) {
               await prisma.revenueTransaction.create({
                 data: { ...mapped, last_hash: currentHash, created_at: new Date() }
               });
             }
          }
        }
      } catch (e: any) {
        console.error(`Error syncing revenue for branch ${task.branch_id}: ${e.message}`);
      }

      // 3. Process each customer detail synchronously
      if (allFoundCustomerIds.size > 0) {
        console.log(`Syncing details for ${allFoundCustomerIds.size} customers synchronously...`);
        let count = 0;
        for (const cId of allFoundCustomerIds) {
          count++;
          console.log(`[${count}/${allFoundCustomerIds.size}] Syncing details for Customer ID: ${cId}...`);
          try {
            await syncService.processQueuedCustomerDetail(cId, task.id);
          } catch (e: any) {
            console.error(`Error syncing details for customer ${cId}: ${e.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 200)); // Small sleep to be gentle
        }
      }

      // 4. Update task to SUCCESS
      await prisma.syncTask.update({
        where: { id: task.id },
        data: {
          status: 'SUCCESS',
          records_count: totalRecords,
          customers_count: allFoundCustomerIds.size,
          appointments_count: appointmentsCount,
          sales_total: daySales,
          revenue_total: dayRevenue,
          total_details: allFoundCustomerIds.size,
          completed_details: allFoundCustomerIds.size,
          error_message: null,
          updated_at: new Date(),
        }
      });
      console.log(`✅ Branch ${task.branch_name} synced successfully!`);

    } catch (err: any) {
      console.error(`❌ Failed to sync branch ${task.branch_name}: ${err.message}`);
      await prisma.syncTask.update({
        where: { id: task.id },
        data: {
          status: 'PENDING', // Put back to pending for retry
          error_message: `Manual sync failed: ${err.message}`,
          updated_at: new Date()
        }
      });
    }
  }

  console.log('\n🚀 ALL PENDING TASKS SYNCED SUCCESSFULLY!');
  await app.close();
}

bootstrap().catch(console.error);
